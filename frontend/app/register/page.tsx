"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import styles from "../login/AuthForm.module.css";
import { Button, Field, Input, Notice, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(email, password, fullName || undefined);
      router.push("/query");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Set up your account to start querying databases.</p>
        </div>

        {error ? <Notice variant="error">{error}</Notice> : null}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Field label="Full name" hint="Optional">
            {(props) => (
              <Input
                {...props}
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            )}
          </Field>

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

          <Field label="Password" hint="At least 10 characters">
            {(props) => (
              <div className={styles.passwordWrapper}>
                <Input
                  {...props}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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
            {loading ? <Spinner label="Creating account..." /> : null}
            <span>Create account</span>
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerLink}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
