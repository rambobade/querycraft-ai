"use client";

import React from "react";
import Link from "next/link";
import { Database, Plus, Sparkles, ChevronDown, Check, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface NavbarProps {
  title?: string;
  onOpenNewConnection?: () => void;
}

export function Navbar({ title, onOpenNewConnection }: NavbarProps) {
  const { connections, activeConnection, setActiveConnection } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="h-16 border-b border-slate-800 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-100">{title || "Console"}</h1>
      </div>

      {/* Connection Selector & Status */}
      <div className="flex items-center gap-3">
        {/* Connection Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors shadow-sm"
          >
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span className="max-w-[160px] truncate">
              {activeConnection ? activeConnection.name : "No Database Connected"}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-lg bg-slate-900 border border-slate-700 shadow-xl py-1 z-50 text-xs"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 border-b border-slate-800 font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                Select Active Database
              </div>
              <div className="max-h-56 overflow-y-auto">
                {connections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveConnection(c);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    <div className="truncate pr-2">
                      <p className="font-medium text-slate-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{c.database_type} {c.is_sample && "• Sample"}</p>
                    </div>
                    {activeConnection?.id === c.id && <Check className="h-4 w-4 text-indigo-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="p-1.5 border-t border-slate-800">
                <Link
                  href="/connections"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Manage Connections
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Engine Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
          <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span>AST Guard Active</span>
        </div>
      </div>
    </header>
  );
}
