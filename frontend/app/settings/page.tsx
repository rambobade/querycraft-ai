"use client";

import React, { useState, useEffect } from "react";
import styles from "./SettingsPage.module.css";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import {
  Button,
  Field,
  Input,
  Select,
  Notice,
  Spinner,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiBase, setApiBase] = useState("https://api.openai.com/v1");
  const [temperature, setTemperature] = useState(0.0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [theme, setTheme] = useState<"system" | "dark" | "light">("system");

  useEffect(() => {
    // Load LLM settings from backend
    setLoading(true);
    api
      .getLLMSettings()
      .then((cfg) => {
        setProvider(cfg.provider || "auto");
        setHasKey(cfg.has_key);
        setModel(cfg.model || "gpt-4o-mini");
        setApiBase(cfg.api_base || "https://api.openai.com/v1");
        setTemperature(cfg.temperature || 0.0);
      })
      .catch((err) => {
        toast.error("Failed to load settings: " + err.message);
      })
      .finally(() => setLoading(false));

    // Load appearance theme
    try {
      const saved = localStorage.getItem("querycraft_theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
      } else {
        setTheme("system");
      }
    } catch {}
  }, [toast]);

  const handleSaveLLM = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateLLMSettings({
        provider,
        api_key: apiKey.trim() || undefined,
        model,
        api_base: apiBase || undefined,
        temperature,
      });
      setHasKey(res.has_key);
      setApiKey("");
      toast.success("AI provider settings saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestLLM = async () => {
    setTesting(true);
    try {
      const res = await api.testLLMConnection();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleThemeChange = (newTheme: "system" | "dark" | "light") => {
    setTheme(newTheme);
    try {
      if (newTheme === "system") {
        localStorage.removeItem("querycraft_theme");
        const isSysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", isSysDark ? "dark" : "light");
      } else {
        localStorage.setItem("querycraft_theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
      }
      toast.success(`Theme updated to ${newTheme}.`);
    } catch {}
  };

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.mainContent}>
        <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <main className={styles.pageBody}>
          {/* Section 1: AI Provider */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>AI provider</h2>
              <p className={styles.sectionDescription}>
                Configure an external language model to generate SQL queries from natural language. Credentials are encrypted server-side with Fernet.
              </p>
            </div>

            <form onSubmit={handleSaveLLM} className={styles.formGrid}>
              <Field label="Provider">
                {(props) => (
                  <Select
                    {...props}
                    value={provider}
                    onChange={(e) => {
                      const p = e.target.value;
                      setProvider(p);
                      if (p === "gemini") {
                        setModel("gemini-1.5-flash");
                      } else if (p === "groq") {
                        setModel("llama-3.3-70b-versatile");
                        setApiBase("https://api.groq.com/openai/v1");
                      } else if (p === "ollama") {
                        setModel("llama3.2");
                        setApiBase("http://localhost:11434/v1");
                      } else if (p === "openai") {
                        setModel("gpt-4o-mini");
                        setApiBase("https://api.openai.com/v1");
                      }
                    }}
                  >
                    <option value="auto">Auto / Server Default</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="heuristic">Built-in Matcher (Sample only)</option>
                  </Select>
                )}
              </Field>

              <Field
                label="API key"
                hint={hasKey ? "Key is saved and encrypted on server. Enter a new key to update." : "Enter your API key."}
              >
                {(props) => (
                  <Input
                    {...props}
                    type="password"
                    placeholder={hasKey ? "••••••••••••••••••••••••" : "sk-..."}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                )}
              </Field>

              <Field label="Model">
                {(props) => (
                  <Input
                    {...props}
                    placeholder="e.g. gpt-4o-mini, gemini-1.5-flash"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                )}
              </Field>

              <div>
                <button
                  type="button"
                  className={styles.advancedToggle}
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "− Hide advanced settings" : "+ Advanced settings"}
                </button>
              </div>

              {showAdvanced ? (
                <>
                  <Field label="API base URL">
                    {(props) => (
                      <Input
                        {...props}
                        placeholder="https://api.openai.com/v1"
                        value={apiBase}
                        onChange={(e) => setApiBase(e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label="Temperature">
                    {(props) => (
                      <Input
                        {...props}
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </Field>
                </>
              ) : null}

              <p className={styles.privacyNotice}>
                Privacy note: Table and column names are sent to your provider. Row data is not.
              </p>

              <div className={styles.actionsRow}>
                <Button type="submit" variant="primary" size="md" disabled={saving}>
                  {saving ? <Spinner label="Saving..." /> : null}
                  <span>Save provider</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleTestLLM}
                  disabled={testing || (!hasKey && !apiKey)}
                >
                  {testing ? <Spinner label="Testing..." /> : null}
                  <span>Test provider</span>
                </Button>
              </div>
            </form>
          </section>

          {/* Section 2: Account */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Account</h2>
              <p className={styles.sectionDescription}>
                Your user profile and session identity.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
              <div>
                <span style={{ color: "var(--text-muted)", display: "inline-block", width: "120px" }}>Email:</span>
                <span>{user?.email || "Unknown"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", display: "inline-block", width: "120px" }}>Role:</span>
                <span>{user?.role || "Developer"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", display: "inline-block", width: "120px" }}>Member since:</span>
                <span>{user?.created_at ? formatDate(user.created_at) : "Recent"}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Appearance */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Appearance</h2>
              <p className={styles.sectionDescription}>
                Select your preferred color theme.
              </p>
            </div>

            <div style={{ maxWidth: "240px" }}>
              <Select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as any)}
                aria-label="Color theme"
              >
                <option value="system">System preference</option>
                <option value="dark">Dark theme</option>
                <option value="light">Light theme</option>
              </Select>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
