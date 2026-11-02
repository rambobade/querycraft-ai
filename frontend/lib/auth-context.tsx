"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, DatabaseConnection } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  connections: DatabaseConnection[];
  activeConnection: DatabaseConnection | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  setActiveConnection: (conn: DatabaseConnection | null) => void;
  refreshConnections: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async () => {
    const token = localStorage.getItem("querycraft_access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const userData = await api.getMe();
      setUser(userData);
      const conns = await api.getConnections();
      setConnections(conns);
      if (conns.length > 0) {
        // Restore last selected connection or select the first one
        const savedConnId = localStorage.getItem("querycraft_active_conn_id");
        const found = conns.find((c) => c.id === savedConnId);
        setActiveConnection(found || conns[0]);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      localStorage.removeItem("querycraft_access_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleSetActiveConnection = (conn: DatabaseConnection | null) => {
    setActiveConnection(conn);
    if (conn) {
      localStorage.setItem("querycraft_active_conn_id", conn.id);
    } else {
      localStorage.removeItem("querycraft_active_conn_id");
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem("querycraft_access_token", res.access_token);
    await fetchUserData();
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await api.register({ email, password, full_name: fullName });
    localStorage.setItem("querycraft_access_token", res.access_token);
    await fetchUserData();
  };

  const logout = () => {
    localStorage.removeItem("querycraft_access_token");
    localStorage.removeItem("querycraft_active_conn_id");
    setUser(null);
    setConnections([]);
    setActiveConnection(null);
    window.location.href = "/login";
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
