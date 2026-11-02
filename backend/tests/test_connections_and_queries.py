import uuid
import pytest
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.connection import DatabaseConnection
from app.schemas.user import UserRegister
from app.schemas.ai import ExplainSQLRequest, OptimizeSQLRequest
from app.schemas.query import QueryExecuteRequest
from app.schemas.saved_query import SavedQueryCreate
from app.ai.sql_generator import SQLGenerator
from app.api.routes import auth, connections, schema, ai, query, saved_queries

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="module")
def authenticated_user(db_session):
    email = f"tester.{uuid.uuid4().hex[:8]}@querycraft.ai"
    reg_in = UserRegister(email=email, password="SafePassword999!", full_name="Query Tester")
    auth.register(reg_in, db=db_session)
    user = db_session.query(User).filter(User.email == email).first()
    return user

def test_connections_schema_and_query_flow(db_session, authenticated_user):
    # 1. User should have pre-seeded sample connection
    user_conns = connections.list_connections(current_user=authenticated_user, db=db_session)
    assert len(user_conns) >= 1
    sample_conn = user_conns[0]
    conn_id = sample_conn.id
    assert sample_conn.is_sample is True

    # 2. Test connection endpoint
    test_res = connections.test_saved_connection(conn_id=conn_id, current_user=authenticated_user, db=db_session)
    assert test_res.success is True

    # 3. Introspect schema
    schema_res = schema.get_database_schema(conn_id=conn_id, current_user=authenticated_user, db=db_session)
    assert schema_res["table_count"] >= 5
    table_names = [t["name"] for t in schema_res["tables"]]
    assert "customers" in table_names
    assert "products" in table_names
    assert "orders" in table_names

    # 4. Generate SQL from natural language (sync engine)
    ai_data = SQLGenerator.generate_sql_sync(
        db_conn=sample_conn,
        natural_language_input="Show the top 5 products by revenue"
    )
    assert "SELECT" in ai_data["sql"].upper()
    assert ai_data["is_valid"] is True
    generated_sql = ai_data["sql"]

    # 5. Explain SQL
    explain_req = ExplainSQLRequest(connection_id=conn_id, sql=generated_sql)
    explain_data = ai.explain_sql(req=explain_req, current_user=authenticated_user, db=db_session)
    assert len(explain_data.steps) > 0
    assert "SELECT" in explain_data.operations

    # 6. Execute SQL
    exec_req = QueryExecuteRequest(
        connection_id=conn_id,
        sql=generated_sql,
        natural_language_input="Show the top 5 products by revenue"
    )
    exec_data = query.execute_sql(req=exec_req, current_user=authenticated_user, db=db_session)
    assert exec_data.success is True
    assert exec_data.row_count > 0
    assert len(exec_data.rows) > 0
    assert exec_data.duration_ms >= 0

    # 7. Check query history
    history = query.get_query_history(connection_id=conn_id, limit=10, current_user=authenticated_user, db=db_session)
    assert len(history) >= 1
    assert history[0].execution_status == "success"

    # 8. Save query
    save_req = SavedQueryCreate(
        connection_id=conn_id,
        title="Top Revenue Products",
        description="Standard report for executive revenue meeting",
        sql_query=generated_sql,
        tags="sales,revenue,products"
    )
    saved_res = saved_queries.create_saved_query(query_in=save_req, current_user=authenticated_user, db=db_session)
    assert saved_res.id is not None
    saved_id = saved_res.id

    # 9. List saved queries
    saved_list = saved_queries.list_saved_queries(connection_id=conn_id, current_user=authenticated_user, db=db_session)
    assert any(s.id == saved_id for s in saved_list)

    # 10. Delete saved query
    saved_queries.delete_saved_query(query_id=saved_id, current_user=authenticated_user, db=db_session)
    post_delete_list = saved_queries.list_saved_queries(connection_id=conn_id, current_user=authenticated_user, db=db_session)
    assert not any(s.id == saved_id for s in post_delete_list)

    # 11. Run Optimization assistant
    opt_req = OptimizeSQLRequest(connection_id=conn_id, sql=generated_sql)
    opt_data = ai.optimize_sql(req=opt_req, current_user=authenticated_user, db=db_session)
    assert opt_data.success is True
    assert opt_data.cost_indicator in ["Low", "Medium", "High"]
