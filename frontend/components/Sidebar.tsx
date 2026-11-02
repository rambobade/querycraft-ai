"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { cx } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Query", href: "/query" },
  { label: "Library", href: "/library" },
  { label: "Connections", href: "/connections" },
  { label: "Settings", href: "/settings" },
];

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen ? (
        <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside
        className={cx(styles.sidebar, isOpen && styles.sidebarOpen)}
        aria-label="Sidebar navigation"
      >
        <div>
          <div className={styles.brand}>
            <span className={styles.brandTitle}>QueryCraft</span>
          </div>

          <nav className={styles.nav} aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/query" && (pathname === "/" || pathname === "/playground")) ||
                (item.href === "/library" && (pathname === "/history" || pathname === "/saved-queries"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(styles.navLink, isActive && styles.navLinkActive)}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={styles.footer}>
          <span>Read-only assistant</span>
        </div>
      </aside>
    </>
  );
}
