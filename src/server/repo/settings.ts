import "server-only";
import { get, run, all } from "../db";

export function getSetting(key: string): string | null {
  return get<{ value: string }>("SELECT value FROM settings WHERE key = ?", key)?.value ?? null;
}

export function setSetting(key: string, value: string | number | null): void {
  if (value === null) {
    run("DELETE FROM settings WHERE key = ?", key);
    return;
  }
  run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key, String(value),
  );
}

export type AppSettings = {
  theme: "light" | "dark";
  diaADiaBudget: number; // centavos; 0 = sem orçamento
  moradiaRef: number; // 0..1
  lastSyncAt: string | null;
  demoMode: boolean;
};

export function getSettings(): AppSettings {
  const m = new Map(all<{ key: string; value: string }>("SELECT key, value FROM settings").map((r) => [r.key, r.value]));
  const num = (k: string, d: number) => (m.has(k) && m.get(k) !== "" && !Number.isNaN(Number(m.get(k))) ? Number(m.get(k)) : d);
  return {
    theme: m.get("theme") === "dark" ? "dark" : "light",
    diaADiaBudget: num("dia_a_dia_budget", 0),
    moradiaRef: num("moradia_ref", 0.3),
    lastSyncAt: m.get("last_sync_at") ?? null,
    demoMode: m.get("demo_mode") === "1",
  };
}
