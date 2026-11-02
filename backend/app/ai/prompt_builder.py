"""
Prompt Builder for QueryCraft AI
Constructs schema-aware prompts with strict security constraints and dialect instructions.
"""
from typing import Dict, Any

SYSTEM_PROMPT = """You are QueryCraft AI, an expert Principal Database Architect and SQL Optimization Engineer.
Your mission is to translate natural language user questions into precise, high-performance, and secure SQL queries.

CRITICAL SECURITY AND SYNTAX RULES:
1. ONLY generate SELECT queries or SELECT queries with Common Table Expressions (WITH).
2. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, or system commands.
3. NEVER generate multiple statements or semicolon-chained queries.
4. Adhere strictly to the target SQL dialect specified in the context.
5. Use appropriate JOIN conditions utilizing the foreign keys described in the schema.
6. Provide meaningful aliases for calculated columns (e.g. `total_revenue`, `avg_salary`).
7. Never invent tables or columns that do not exist in the provided schema.
8. If the question cannot be answered using the provided schema, return an explanation explaining what is missing.

RESPONSE FORMAT:
You MUST respond with a valid JSON object strictly matching this schema:
{
  "sql": "SELECT ...",
  "explanation": "Brief 1-3 sentence explanation of how the query answers the question.",
  "tables_used": ["table1", "table2"],
  "query_type": "SELECT",
  "warnings": ["any caveat, assumption, or performance note"],
  "confidence": "high" | "medium" | "low"
}
Do not wrap your response in markdown code blocks like ```json ... ```. Output pure raw JSON only.
"""

def build_generation_prompt(
    natural_language_input: str,
    schema_summary: str,
    dialect: str = "sqlite"
) -> str:
    """Format schema and user question into prompt."""
    return f"""Target SQL Dialect: {dialect.upper()}

Connected Database Schema Context:
{schema_summary}

User Question:
"{natural_language_input}"

Generate the optimal, secure SQL query and structured JSON response:"""

def build_explanation_prompt(sql: str, dialect: str = "sqlite") -> str:
    """Format SQL query for detailed explanation."""
    return f"""Analyze and explain the following {dialect.upper()} SQL query:
```sql
{sql}
```

Respond with a JSON object:
{{
  "summary": "High-level summary of what the query accomplishes.",
  "steps": [
    "Step 1: Description...",
    "Step 2: Description..."
  ],
  "operations": ["FILTER", "AGGREGATE", "JOIN", "ORDER BY"],
  "performance_notes": "Note regarding index usage or potential bottlenecks.",
  "security_status": "Verified Safe Read-Only SELECT"
}}
Output raw JSON only."""
