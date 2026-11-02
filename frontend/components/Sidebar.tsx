"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Terminal,
  Database,
  FileCode2,
  History,
  BookmarkCheck,
  Settings,
  BookOpen,
  LogOut,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "SQL Playground", href: "/playground", icon: Terminal, highlight: true },
  { label: "Connections", href: "/connections", icon: Database },
  { label: "Schema Explorer", href: "/schema", icon: FileCode2 },
  { label: "Query History", href: "/history", icon: History },
  { label: "Saved Queries", href: "/saved-queries", icon: BookmarkCheck },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Documentation", href: "/docs", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-slate-800 bg-[#0b101d] h-screen sticky top-0 select-none">
      <div>
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-base tracking-tight">QueryCraft AI</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">NL to SQL Assistant</p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-[11px]">Read-Only SELECT Enforced</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
                  item.highlight && !isActive && "text-indigo-400 hover:text-indigo-300 font-semibold"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : item.highlight ? "text-indigo-400" : "text-slate-400")} />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                    Core
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User info & Logout */}
      <div className="p-4 border-t border-slate-800/80">
        {user ? (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.full_name || user.email}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
          >
            Sign In / Register
          </Link>
        )}
      </div>
    </aside>
  );
}
