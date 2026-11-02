# QueryCraft AI — Security & Threat Model

Database security is the primary design pillar of **QueryCraft AI**. We enforce strict isolation, cryptographic storage, and deterministic AST verification.

---

## 1. Threat Matrix & Mitigations

| Threat Vector | Risk Description | QueryCraft AI Mitigation |
| :--- | :--- | :--- |
| **SQL Injection via LLM** | Malicious prompt crafts a query with embedded mutation or subquery injection. | **SQLGlot AST Parsing**: The query is deconstructed into a syntax tree. Only `Select` or CTE roots are permitted. All `Insert`, `Update`, `Delete`, `Drop`, `Alter`, `Truncate`, `Create`, `Grant` nodes are blocked. |
| **Semicolon Statement Chaining** | Attacker appends `; DROP TABLE users;` to a legitimate SELECT. | **Multi-statement rejection**: The AST parser counts statements; any payload with `> 1` statement is immediately halted before database dispatch. |
| **Denial of Service (DoS)** | Query returns 10,000,000 rows, exhausting backend memory. | **Auto-LIMIT Clamping**: AST visitor verifies `Limit` node. If missing, `LIMIT 100` is injected. If oversized, it is clamped to `MAX_ROWS_RETURNED` (default: 1,000). |
| **Credential Theft at Rest** | Database connection passwords stored as plaintext in database. | **Fernet Encryption**: Passwords and connection URLs are encrypted at rest using Fernet (AES-128-CBC with SHA256 HMAC authentication). |
| **Execution Timeouts** | Expensive recursive CTE or cartesian cross-join hangs server. | **Execution Options**: SQLAlchemy queries run with a strict execution timeout (default: 15s) and cancel long-running transactions. |
| **Catalog Probing** | LLM tries to query `pg_shadow`, `pg_authid`, or `mysql.user`. | **Forbidden Catalog Patterns**: Blacklists sensitive authentication and permission system tables across dialects. |

---

## 2. Multi-Layer Defense

```
[ Natural Language Input ]
          │
          ▼
[ Schema-Aware Prompt Guard ]
          │
          ▼
[ Deterministic SQLGlot AST Parser ] ──(Reject DDL / DML / Chained Statements)
          │
          ▼
[ Safe LIMIT Injection & Clamping ]
          │
          ▼
[ Explicit User Authorization in Editor ]
          │
          ▼
[ Read-Only Target Database Engine ] ──(15s Execution Timeout)
          │
          ▼
[ Sanitized Output & Truncation ]
```
