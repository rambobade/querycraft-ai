export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  database_type: "sqlite" | "postgresql" | "mysql";
  host?: string;
  port?: string;
  database_name?: string;
  username?: string;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  default?: string | null;
  primary_key: boolean;
}

export interface ForeignKeySchema {
  constrained_columns: string[];
  referred_table: string;
  referred_columns: string[];
}

export interface IndexSchema {
  name: string;
  column_names: string[];
  unique: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primary_keys: string[];
  foreign_keys: ForeignKeySchema[];
  indexes: IndexSchema[];
  row_count: number;
}

export interface DatabaseSchema {
  database_name: string;
  database_type: string;
  table_count: number;
  tables: TableSchema[];
}

export interface AISqlResponse {
  sql: string;
  sanitized_sql: string;
  explanation: string;
  tables_used: string[];
  query_type: string;
  warnings: string[];
  confidence: "high" | "medium" | "low";
  source: "llm" | "heuristic";
  notice?: string;
  is_valid: boolean;
  validation_errors: string[];
}

export interface LLMSetting {
  provider: string;
  has_key: boolean;
  model: string;
  api_base: string;
  temperature: number;
  updated_at?: string;
}

export interface AIExplanation {
  summary: string;
  steps: string[];
  operations: string[];
  performance_notes: string;
  security_status: string;
}

export interface OptimizationSuggestion {
  type: string;
  title: string;
  description: string;
}

export interface AIOptimization {
  success: boolean;
  dialect: string;
  cost_indicator: "Low" | "Medium" | "High" | "Unknown";
  plan: { detail: string }[];
  suggestions: OptimizationSuggestion[];
  tables_involved: string[];
  columns_involved: string[];
  error?: string;
}

export interface QueryExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
  duration_ms: number;
  sanitized_sql: string;
  warnings: string[];
  error?: string;
  history_id?: string;
}

export interface QueryHistoryItem {
  id: string;
  connection_id: string;
  natural_language_input?: string;
  generated_sql: string;
  executed_sql: string;
  execution_status: "success" | "error" | "blocked";
  execution_duration_ms: number;
  row_count: number;
  error_message?: string;
  created_at: string;
}

export interface SavedQuery {
  id: string;
  connection_id: string;
  title: string;
  description?: string;
  natural_language_input?: string;
  sql_query: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}
