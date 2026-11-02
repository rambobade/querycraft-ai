import {
  User,
  DatabaseConnection,
  DatabaseSchema,
  AISqlResponse,
  AIExplanation,
  AIOptimization,
  QueryExecutionResult,
  QueryHistoryItem,
  SavedQuery,
  LLMSetting,
} from "./types";

const API_BASE = "/api";

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== "undefined" ? localStorage.getItem("querycraft_access_token") : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...this.getAuthHeaders(), ...options.headers };

    const res = await fetch(url, { ...options, headers, credentials: "include" });

    if (res.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        localStorage.removeItem("querycraft_access_token");
        window.location.href = "/login";
      }
    }

    if (!res.ok) {
      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // Auth
  async register(data: { email: string; password: string; full_name?: string }) {
    return this.request<{ access_token: string; refresh_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("querycraft_access_token");
      }
    }
  }

  async demoLogin(): Promise<{ access_token: string; refresh_token: string }> {
    return this.request<{ access_token: string; refresh_token: string }>("/auth/demo", {
      method: "POST",
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // Connections
  async getConnections(): Promise<DatabaseConnection[]> {
    return this.request<DatabaseConnection[]>("/connections");
  }

  async createConnection(data: any): Promise<DatabaseConnection> {
    return this.request<DatabaseConnection>("/connections", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/connections/${id}/test`, {
      method: "POST",
    });
  }

  async testRawConnection(data: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/connections/test-raw", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteConnection(id: string): Promise<void> {
    return this.request<void>(`/connections/${id}`, {
      method: "DELETE",
    });
  }

  // Schema
  async getSchema(connectionId: string): Promise<DatabaseSchema> {
    return this.request<DatabaseSchema>(`/schema/${connectionId}`);
  }

  // AI
  async generateSQL(
    params: {
      connection_id: string;
      natural_language_input: string;
    },
    signal?: AbortSignal
  ): Promise<AISqlResponse> {
    return this.request<AISqlResponse>("/ai/generate-sql", {
      method: "POST",
      body: JSON.stringify(params),
      signal,
    });
  }

  async explainSQL(connectionId: string, sql: string, signal?: AbortSignal): Promise<AIExplanation> {
    return this.request<AIExplanation>("/ai/explain-sql", {
      method: "POST",
      body: JSON.stringify({ connection_id: connectionId, sql }),
      signal,
    });
  }

  async optimizeSQL(connectionId: string, sql: string, signal?: AbortSignal): Promise<AIOptimization> {
    return this.request<AIOptimization>("/ai/optimize-sql", {
      method: "POST",
      body: JSON.stringify({ connection_id: connectionId, sql }),
      signal,
    });
  }

  // LLM Settings
  async getLLMSettings(): Promise<LLMSetting> {
    return this.request<LLMSetting>("/settings/llm");
  }

  async updateLLMSettings(data: {
    provider: string;
    api_key?: string;
    model?: string;
    api_base?: string;
    temperature?: number;
  }): Promise<LLMSetting> {
    return this.request<LLMSetting>("/settings/llm", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async testLLMConnection(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/settings/llm/test", {
      method: "POST",
    });
  }

  // Query Execution
  async validateSQL(connectionId: string, sql: string, signal?: AbortSignal) {
    return this.request<{
      is_valid: boolean;
      sanitized_sql: string;
      errors: string[];
      warnings: string[];
      applied_limit?: number;
    }>("/query/validate", {
      method: "POST",
      body: JSON.stringify({ connection_id: connectionId, sql }),
      signal,
    });
  }

  async executeSQL(
    params: {
      connection_id: string;
      sql: string;
      natural_language_input?: string;
    },
    signal?: AbortSignal
  ): Promise<QueryExecutionResult> {
    return this.request<QueryExecutionResult>("/query/execute", {
      method: "POST",
      body: JSON.stringify(params),
      signal,
    });
  }

  async getQueryHistory(connectionId?: string): Promise<QueryHistoryItem[]> {
    const query = connectionId ? `?connection_id=${connectionId}` : "";
    return this.request<QueryHistoryItem[]>(`/query/history${query}`);
  }

  async deleteQueryHistory(id: string): Promise<void> {
    return this.request<void>(`/query/history/${id}`, {
      method: "DELETE",
    });
  }

  async clearAllHistory(): Promise<void> {
    return this.request<void>("/query/history", {
      method: "DELETE",
    });
  }

  // Saved Queries
  async getSavedQueries(connectionId?: string): Promise<SavedQuery[]> {
    const query = connectionId ? `?connection_id=${connectionId}` : "";
    return this.request<SavedQuery[]>(`/saved-queries${query}`);
  }

  async createSavedQuery(data: {
    connection_id: string;
    title: string;
    description?: string;
    natural_language_input?: string;
    sql_query: string;
    tags?: string;
  }): Promise<SavedQuery> {
    return this.request<SavedQuery>("/saved-queries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteSavedQuery(id: string): Promise<void> {
    return this.request<void>(`/saved-queries/${id}`, {
      method: "DELETE",
    });
  }
}

export const api = new ApiService();
