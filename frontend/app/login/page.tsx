"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldCheck, ArrowRight, AlertCircle, Key, Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setEmail("demo.architect@querycraft.ai");
    setPassword("DemoPassword123!");
    setLoading(true);
    setError(null);
    try {
      // Attempt login first, if user doesn't exist, register them
      try {
        await login("demo.architect@querycraft.ai", "DemoPassword123!");
      } catch {
        const { api } = await import("@/lib/api");
        const res = await api.register({
          email: "demo.architect@querycraft.ai",
          password: "DemoPassword123!",
          full_name: "Demo Architect",
        });
        localStorage.setItem("querycraft_access_token", res.access_token);
        await login("demo.architect@querycraft.ai", "DemoPassword123!");
      }
      router.push("/");
    } catch (e: any) {
      setError(e.message || "Failed to initialize demo session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 items-center justify-center text-indigo-400 shadow-md shadow-indigo-600/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">QueryCraft AI</h1>
          <p className="text-xs text-slate-400">Natural Language to SQL Query Assistant</p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="architect@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors shadow-md shadow-indigo-600/30"
            >
              {loading ? "Authenticating..." : "Sign In to Console"}
            </button>
          </form>

          {/* Quick Demo Fill Button */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-600 text-[10px] uppercase font-semibold">Or Quick Access</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-xs border border-slate-700/60"
          >
            <Key className="h-3.5 w-3.5 text-indigo-400" />
            <span>1-Click Demo Login</span>
          </button>

          <p className="text-center text-slate-500 text-[11px] pt-1">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-indigo-400 hover:underline font-semibold">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
