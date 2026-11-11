"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { setTheme } from "@/server/actions/settings";

export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [theme, set] = useState(initial);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    set(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    void setTheme(next);
  };
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      className="inline-flex size-9 items-center justify-center rounded-xl bg-card text-muted transition hover:bg-soft hover:text-ink"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
