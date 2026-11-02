"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./Menu.module.css";
import { cx } from "@/lib/utils";

export interface MenuItem {
  id: string;
  label: string;
  onClick: () => void;
  isDanger?: boolean;
}

export interface MenuProps {
  trigger: (props: { onClick: () => void; isOpen: boolean }) => React.ReactNode;
  items: (MenuItem | "divider")[];
  className?: string;
}

export function Menu({ trigger, items, className }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.wrapper} ref={menuRef}>
      {trigger({ onClick: () => setIsOpen((prev) => !prev), isOpen })}
      {isOpen ? (
        <div className={cx(styles.menu, className)} role="menu">
          {items.map((item, idx) => {
            if (item === "divider") {
              return <div key={`div-${idx}`} className={styles.divider} />;
            }
            return (
              <button
                key={item.id}
                role="menuitem"
                className={cx(styles.item, item.isDanger && styles.itemDanger)}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
