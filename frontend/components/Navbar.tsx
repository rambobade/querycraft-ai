"use client";

import React, { useState } from "react";
import { Menu as MenuIcon, ChevronDown, Moon, Sun, HelpCircle, LogOut } from "lucide-react";
import styles from "./Navbar.module.css";
import { useAuth } from "@/lib/auth-context";
import { Menu, Dialog, Kbd } from "@/components/ui";

export interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, connections, activeConnection, setActiveConnection, logout } = useAuth();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("querycraft_theme", next);
    } catch {}
  };

  const connectionMenuItems = connections.map((conn) => ({
    id: conn.id,
    label: `${conn.name} (${conn.database_type.toUpperCase()})`,
    onClick: () => setActiveConnection(conn),
  }));

  const userMenuItems = [
    {
      id: "theme",
      label: "Toggle light / dark theme",
      onClick: toggleTheme,
    },
    {
      id: "help",
      label: "Keyboard shortcuts & help",
      onClick: () => setShowShortcuts(true),
    },
    "divider" as const,
    {
      id: "logout",
      label: "Sign out",
      onClick: logout,
      isDanger: true,
    },
  ];

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.left}>
          {onToggleSidebar ? (
            <button
              className={styles.menuToggle}
              onClick={onToggleSidebar}
              aria-label="Toggle navigation menu"
            >
              <MenuIcon size={18} strokeWidth={1.5} />
            </button>
          ) : null}

          {connections.length > 0 ? (
            <Menu
              trigger={({ onClick, isOpen }) => (
                <button
                  className={styles.connectionSelect}
                  onClick={onClick}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-label="Select database connection"
                >
                  <span>{activeConnection?.name || "Select connection"}</span>
                  <span className={styles.connectionType}>
                    {activeConnection?.database_type}
                  </span>
                  <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
                </button>
              )}
              items={connectionMenuItems}
            />
          ) : null}
        </div>

        <div className={styles.right}>
          <Menu
            trigger={({ onClick, isOpen }) => (
              <button
                className={styles.userButton}
                onClick={onClick}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="User account menu"
              >
                <span>{user?.email || "Account"}</span>
                <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
            items={userMenuItems}
          />
        </div>
      </header>

      <Dialog
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title="Keyboard Shortcuts & Help"
        maxWidth="440px"
      >
        <div className={styles.shortcutsModalList}>
          <div className={styles.shortcutRow}>
            <span>Generate SQL query</span>
            <Kbd>Ctrl / ⌘ + Enter</Kbd>
          </div>
          <div className={styles.shortcutRow}>
            <span>Run SQL in editor</span>
            <Kbd>Ctrl / ⌘ + Enter</Kbd>
          </div>
          <div className={styles.shortcutRow}>
            <span>Close open dialog</span>
            <Kbd>Escape</Kbd>
          </div>
          <div className={styles.shortcutRow} style={{ marginTop: "var(--space-2)" }}>
            <span style={{ color: "var(--text-muted)" }}>
              All database sessions operate under read-only transaction isolation with 15-second execution timeouts and maximum 1,000 row limits.
            </span>
          </div>
        </div>
      </Dialog>
    </>
  );
}
