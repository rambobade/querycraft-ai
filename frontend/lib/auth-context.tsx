"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, DatabaseConnection } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  connections: DatabaseConnection[];
  activeConnection: DatabaseConnection | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  setActiveConnection: (conn: DatabaseConnection | null) => void;
  refreshConnections: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
      const conns = await api.getConnections();
      setConnections(conns);
      if (conns.length > 0) {
        const savedConnId = typeof window !== "undefined" ? localStorage.getItem("querycraft_active_conn_id") : null;
        const found = conns.find((c) => c.id === savedConnId);
        setActiveConnection(found || conns[0]);
      }
    } catch {
      setUser(null);
      setConnections([]);
      setActiveConnection(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleSetActiveConnection = (conn: DatabaseConnection | null) => {
    setActiveConnection(conn);
    if (conn && typeof window !== "undefined") {
      localStorage.setItem("querycraft_active_conn_id", conn.id);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("querycraft_active_conn_id");
    }
  };

  const login = async (email: string, password: string) => {
    await api.login({ email, password });
    await fetchUserData();
  };

  const register = async (email: string, password: string, fullName?: string) => {
    await api.register({ email, password, full_name: fullName });
    await fetchUserData();
  };

  const demoLogin = async () => {
    await api.demoLogin();
    await fetchUserData();
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("querycraft_active_conn_id");
        localStorage.removeItem("querycraft_access_token");
      }
      setUser(null);
      setConnections([]);
      setActiveConnection(null);
      window.location.href = "/login";
    }
  };

  const refreshConnections = async () => {
    try {
      const conns = await api.getConnections();
      setConnections(conns);
      if (conns.length > 0 && !activeConnection) {
        setActiveConnection(conns[0]);
      }
    } catch (e) {
      console.error("Failed to refresh connections", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        connections,
        activeConnection,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        setActiveConnection: handleSetActiveConnection,
        refreshConnections,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
