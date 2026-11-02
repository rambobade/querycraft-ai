"use client";

import React, { useState } from "react";
import { Plus, RefreshCw, Trash2, Check, AlertCircle } from "lucide-react";
import styles from "./ConnectionsPage.module.css";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
  ConfirmDialog,
  Notice,
  Spinner,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DatabaseConnection } from "@/lib/types";

export default function ConnectionsPage() {
  const { connections, activeConnection, setActiveConnection, refreshConnections } = useAuth();
  const toast = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [connectionToDelete, setConnectionToDelete] = useState<DatabaseConnection | null>(null);

  // Add Connection Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dbType, setDbType] = useState<"postgresql" | "mysql" | "sqlite">("postgresql");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("5432");
  const [dbName, setDbName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sqlitePath, setSqlitePath] = useState("");

  const [rawTesting, setRawTesting] = useState(false);
  const [rawTestResult, setRawTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setHost("");
    setPort(dbType === "postgresql" ? "5432" : dbType === "mysql" ? "3306" : "");
    setDbName("");
    setUsername("");
    setPassword("");
    setSqlitePath("");
    setRawTestResult(null);
  };

  const handleTypeChange = (type: "postgresql" | "mysql" | "sqlite") => {
    setDbType(type);
    if (type === "postgresql") setPort("5432");
    else if (type === "mysql") setPort("3306");
    else setPort("");
    setRawTestResult(null);
  };

  const handleTestExisting = async (conn: DatabaseConnection) => {
    setTestingId(conn.id);
    try {
      const res = await api.testConnection(conn.id);
      setTestResults((prev) => ({ ...prev, [conn.id]: res }));
      if (res.success) {
        toast.success(`Connection "${conn.name}" verified.`);
      } else {
        toast.error(`Connection failed: ${res.message}`);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [conn.id]: { success: false, message: err.message || "Test failed" },
      }));
      toast.error(err.message || "Test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleTestRaw = async () => {
    setRawTesting(true);
    setRawTestResult(null);
    try {
      const payload: any = {
        database_type: dbType,
      };
      if (dbType === "sqlite") {
        payload.database_name = sqlitePath.trim();
      } else {
        payload.host = host.trim();
        payload.port = port.trim();
        payload.database_name = dbName.trim();
        payload.username = username.trim();
        payload.password = password;
      }

      const res = await api.testRawConnection(payload);
      setRawTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      setRawTestResult({ success: false, message: err.message || "Test failed" });
      toast.error(err.message || "Test failed");
    } finally {
      setRawTesting(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        database_type: dbType,
      };
      if (dbType === "sqlite") {
        payload.database_name = sqlitePath.trim();
      } else {
        payload.host = host.trim();
        payload.port = port.trim();
        payload.database_name = dbName.trim();
        payload.username = username.trim();
        payload.password = password;
      }

      await api.createConnection(payload);
      await refreshConnections();
      toast.success("Database connection added.");
      setAddDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to create connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;
    try {
      await api.deleteConnection(connectionToDelete.id);
      await refreshConnections();
      if (activeConnection?.id === connectionToDelete.id) {
        setActiveConnection(null);
      }
      toast.success(`Deleted connection "${connectionToDelete.name}".`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete connection.");
    } finally {
      setConnectionToDelete(null);
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.mainContent}>
        <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <main className={styles.pageBody}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Connections</h1>
              <p className={styles.subtitle}>
                Connect PostgreSQL, MySQL, and SQLite databases. Use a read-only database user.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                resetForm();
                setAddDialogOpen(true);
              }}
            >
              <Plus size={14} strokeWidth={1.5} />
              <span>Add connection</span>
            </Button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Type</th>
                  <th className={styles.th}>Host / Database</th>
                  <th className={styles.th}>Last test</th>
                  <th className={styles.th} style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => {
                  const test = testResults[conn.id];
                  const isTesting = testingId === conn.id;
                  const hostDisplay = conn.is_sample
                    ? "Sample database"
                    : conn.database_type === "sqlite"
                    ? conn.database_name || "local.db"
                    : `${conn.host || "localhost"}${conn.port ? `:${conn.port}` : ""}/${conn.database_name || ""}`;

                  return (
                    <tr key={conn.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <span style={{ fontWeight: 500 }}>{conn.name}</span>
                          {conn.is_sample ? (
                            <span className={styles.sampleBadge}>Sample data</span>
                          ) : null}
                        </div>
                      </td>

                      <td className={styles.td}>
                        <span className={styles.typeBadge}>{conn.database_type}</span>
                      </td>

                      <td className={styles.td}>
                        <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                          {hostDisplay}
                        </code>
                      </td>

                      <td className={styles.td}>
                        {isTesting ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--text-xs)" }}>
                            <Spinner label="Testing..." />
                            <span>Testing…</span>
                          </div>
                        ) : test ? (
                          <span
                            className={`${styles.testResult} ${
                              test.success ? styles.testSuccess : styles.testError
                            }`}
                          >
                            {test.success ? "Success" : "Failed"}
                          </span>
                        ) : (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                            Not tested
                          </span>
                        )}
                      </td>

                      <td className={styles.td} style={{ textAlign: "right" }}>
                        <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
                          <Button
                            variant="quiet"
                            size="sm"
                            onClick={() => handleTestExisting(conn)}
                            disabled={isTesting}
                            aria-label={`Test connection ${conn.name}`}
                            title="Test connection"
                          >
                            <RefreshCw size={14} strokeWidth={1.5} />
                          </Button>

                          {!conn.is_sample ? (
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => setConnectionToDelete(conn)}
                              aria-label={`Delete connection ${conn.name}`}
                              title="Delete connection"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Add Connection Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title="Add connection"
        maxWidth="500px"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={handleTestRaw}
              disabled={rawTesting || saving}
            >
              {rawTesting ? <Spinner label="Testing..." /> : null}
              <span>Test connection</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
            >
              Save connection
            </Button>
          </>
        }
      >
        <div className={styles.dialogFields}>
          <Notice variant="info">
            Use a read-only database user. Connections to private or loopback IP ranges are blocked by default.
          </Notice>

          <Field label="Database type">
            {(props) => (
              <Select
                {...props}
                value={dbType}
                onChange={(e) => handleTypeChange(e.target.value as any)}
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
              </Select>
            )}
          </Field>

          <Field label="Display name">
            {(props) => (
              <Input
                {...props}
                placeholder="e.g. Production Analytics"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>

          {dbType === "sqlite" ? (
            <Field label="File path" hint="Must reside within the authorized database upload directory">
              {(props) => (
                <Input
                  {...props}
                  placeholder="e.g. analytics.db"
                  value={sqlitePath}
                  onChange={(e) => setSqlitePath(e.target.value)}
                />
              )}
            </Field>
          ) : (
            <>
              <div className={styles.dialogRow}>
                <Field label="Host">
                  {(props) => (
                    <Input
                      {...props}
                      placeholder="db.example.com"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Port">
                  {(props) => (
                    <Input
                      {...props}
                      placeholder="5432"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  )}
                </Field>
              </div>

              <Field label="Database name">
                {(props) => (
                  <Input
                    {...props}
                    placeholder="my_database"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                  />
                )}
              </Field>

              <div className={styles.dialogRow}>
                <Field label="User">
                  {(props) => (
                    <Input
                      {...props}
                      placeholder="readonly_user"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Password">
                  {(props) => (
                    <Input
                      {...props}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </>
          )}

          {rawTestResult ? (
            <Notice variant={rawTestResult.success ? "success" : "error"}>
              {rawTestResult.message}
            </Notice>
          ) : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(connectionToDelete)}
        title="Delete database connection"
        message={`Are you sure you want to delete "${connectionToDelete?.name}"? You will no longer be able to query this database.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConnectionToDelete(null)}
      />
    </div>
  );
}
