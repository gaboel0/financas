import "server-only";
import { db } from "../db";
import { hasCredentials } from "./client";
import { syncAll, syncIfChanged, type SyncResult } from "./sync";

const CHECK_EVERY = 5 * 60 * 1000; // checagem leve: só baixa se a Pluggy tiver dado novo
const FULL_EVERY = 6 * 60 * 60 * 1000; // sync completo de segurança
const OPEN_THROTTLE = 60 * 1000; // ao abrir/navegar no app, no máximo 1 checagem por minuto

type G = typeof globalThis & { __fcLastCheck?: number };

const log = (r: SyncResult | null) => {
  if (r) console.log(`[financas] sync: ${r.ok ? "ok" : "com erros"}, ${r.upserted} transações`);
};
const fail = (e: unknown) => console.error("[financas] sync falhou:", e);

function check(): void {
  (globalThis as G).__fcLastCheck = Date.now();
  syncIfChanged().then(log).catch(fail);
}

/** Chamado ao abrir uma página: checa em segundo plano se faz mais de 1 min da última checagem. */
export function kickUpdateCheck(): void {
  if (!hasCredentials()) return;
  const last = (globalThis as G).__fcLastCheck ?? 0;
  if (Date.now() - last > OPEN_THROTTLE) check();
}

/** Migra o banco, sincroniza no startup, checa novidades a cada 5 min e faz sync completo a cada 6h. */
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
  (globalThis as G).__fcLastCheck = Date.now();
  syncAll().then(log).catch(fail);
  setInterval(check, CHECK_EVERY).unref?.();
  setInterval(() => syncAll().then(log).catch(fail), FULL_EVERY).unref?.();
}
