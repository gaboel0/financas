import "server-only";
import { PluggyClient } from "pluggy-sdk";

type G = typeof globalThis & { __fcPluggy?: PluggyClient };

export function hasCredentials(): boolean {
  return Boolean(process.env.PLUGGY_CLIENT_ID?.trim() && process.env.PLUGGY_CLIENT_SECRET?.trim());
}

/** Cliente Pluggy (secret só existe no servidor). */
export function getPluggyClient(): PluggyClient {
  if (!hasCredentials()) throw new Error("Credenciais da Pluggy não configuradas.");
  const g = globalThis as G;
  if (!g.__fcPluggy) {
    g.__fcPluggy = new PluggyClient({
      clientId: process.env.PLUGGY_CLIENT_ID!.trim(),
      clientSecret: process.env.PLUGGY_CLIENT_SECRET!.trim(),
    });
  }
  return g.__fcPluggy;
}
