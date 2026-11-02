"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import {
  Settings,
  Cpu,
  Key,
  ShieldCheck,
  User,
  Sliders,
  Check,
  Info,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  // LLM Settings (stored locally for client-side override)
  const [provider, setProvider] = useState("auto");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiBase, setApiBase] = useState("https://api.openai.com/v1");
  const [temperature, setTemperature] = useState(0.0);
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const savedProv = localStorage.getItem("qc_llm_provider");
    const savedKey = localStorage.getItem("qc_llm_key");
    const savedModel = localStorage.getItem("qc_llm_model");
    const savedBase = localStorage.getItem("qc_llm_base");
    if (savedProv) setProvider(savedProv);
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setModel(savedModel);
    if (savedBase) setApiBase(savedBase);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("qc_llm_provider", provider);
    localStorage.setItem("qc_llm_key", apiKey);
    localStorage.setItem("qc_llm_model", model);
    localStorage.setItem("qc_llm_base", apiBase);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Settings & Architecture" />

        <main className="flex-1 p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-8 text-xs">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-slate-100">System Settings</h2>
            <p className="text-slate-400 mt-0.5">
              Configure LLM integration parameters, inspection policies, and security guardrails.
            </p>
          </div>

          {/* Section 1: LLM Provider Configuration */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm">AI / LLM Integration Layer</h3>
                  <p className="text-[11px] text-slate-400">Configure provider endpoints or use zero-config heuristic fallback</p>
                </div>
              </div>

              {savedSuccess && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Check className="h-3.5 w-3.5" />
                  <span>Preferences Saved</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Active LLM Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "auto", label: "Auto Detect" },
                    { id: "openai", label: "OpenAI" },
                    { id: "groq", label: "Groq" },
                    { id: "ollama", label: "Ollama (Local)" },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setProvider(p.id);
                        if (p.id === "groq") {
                          setApiBase("https://api.groq.com/openai/v1");
                          setModel("llama-3.3-70b-versatile");
                        } else if (p.id === "ollama") {
                          setApiBase("http://localhost:11434/v1");
                          setModel("llama3");
                        } else if (p.id === "openai") {
                          setApiBase("https://api.openai.com/v1");
                          setModel("gpt-4o-mini");
                        }
                      }}
                      className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                        provider === p.id
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  <span>If left blank, QueryCraft AI seamlessly runs using its built-in schema heuristic engine.</span>
                </p>
              </div>

              {/* Model & Base URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Model Name</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">API Base Endpoint</label>
                  <input
                    type="text"
                    value={apiBase}
                    onChange={(e) => setApiBase(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-sm transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save AI Preferences</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Security Policy Guardrails */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">Security Guardrails & Safety Enforcement</h3>
                <p className="text-[11px] text-slate-400">Deterministic AST rules applied before every execution</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block text-xs">Read-Only SELECT Enforcement</span>
                <p className="text-[11px] text-slate-400">
                  Blocks all INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, and DDL operations.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block text-xs">Multi-Statement Guard</span>
                <p className="text-[11px] text-slate-400">
                  AST checks reject semicolon-chained injections, executing strictly 1 query per request.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block text-xs">Auto-LIMIT Clamping</span>
                <p className="text-[11px] text-slate-400">
                  Automatically appends LIMIT 100 if none provided; strictly caps queries to a max of 1,000 rows.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block text-xs">Credential Cryptography</span>
                <p className="text-[11px] text-slate-400">
                  Database passwords and connection strings are encrypted at rest with Fernet AES-128-CBC.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: User Profile */}
          {user && (
            <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm">Account Information</h3>
                  <p className="text-[11px] text-slate-400">Authenticated user session</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300 font-mono text-[11px]">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Email</span>
                  <span className="text-slate-200">{user.email}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Role</span>
                  <span className="text-indigo-400 capitalize">{user.role}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Member Since</span>
                  <span className="text-slate-200">{formatDate(user.created_at)}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
