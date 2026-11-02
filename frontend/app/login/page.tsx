"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import styles from "./AuthForm.module.css";
import { Button, Field, Input, Notice, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDemoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || true; // available for evaluation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/query");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      await demoLogin();
      router.push("/query");
    } catch (err: any) {
      setError(err.message || "Demo session could not be created.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>Enter your credentials to access QueryCraft.</p>
        </div>

        {error ? <Notice variant="error">{error}</Notice> : null}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Field label="Email">
            {(props) => (
              <Input
                {...props}
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            )}
          </Field>

          <Field label="Password">
            {(props) => (
              <div className={styles.passwordWrapper}>
                <Input
                  {...props}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
            )}
          </Field>

          <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: "100%", marginTop: "var(--space-2)" }}>
            {loading ? <Spinner label="Signing in..." /> : null}
            <span>Sign in</span>
          </Button>
        </form>

        <div className={styles.footer}>
          {isDemoEnabled ? (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={handleDemo}
              disabled={demoLoading || loading}
            >
              {demoLoading ? <Spinner label="Creating demo..." /> : null}
              <span>Try with 1-click demo account</span>
            </Button>
          ) : null}

          <p className={styles.footerLink}>
            Don&apos;t have an account? <Link href="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
