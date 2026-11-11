import "server-only";
import { db } from "../db";
import { hasCredentials } from "./client";
import { syncAll } from "./sync";

const SIX_HOURS = 6 * 60 * 60 * 1000;

/** Migra o banco, sincroniza no startup e agenda sync a cada 6h (só com credenciais). */
export function startScheduler(): void {
  try {
    db();
  } catch (e) {
    console.error("[financas] erro ao abrir o banco:", e);
    return;
  }
  if (!hasCredentials()) {
    console.log("[financas] sem credenciais da Pluggy: rodando com dados manuais/demo.");
    return;
  }
  const tick = () => {
    syncAll()
      .then((r) => console.log(`[financas] sync: ${r.ok ? "ok" : "com erros"}, ${r.upserted} transações`))
      .catch((e) => console.error("[financas] sync falhou:", e));
  };
  tick();
  const timer = setInterval(tick, SIX_HOURS);
  timer.unref?.();
}
