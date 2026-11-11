import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "./migrations";
import { seedIfEmpty } from "./seed";

type SqlValue = string | number | bigint | null | Uint8Array;
type G = typeof globalThis & { __fcDb?: DatabaseSync };

export function dataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

/** Conexão única (guardada em globalThis por causa do HMR). Migra e semeia no primeiro uso. */
export function db(): DatabaseSync {
  const g = globalThis as G;
  if (g.__fcDb) return g.__fcDb;
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const d = new DatabaseSync(path.join(dir, "financas.db"));
  d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(d);
  g.__fcDb = d;
  seedIfEmpty(d);
  return d;
}

function clean(params: unknown[]): SqlValue[] {
  return params.map((p) => (p === undefined ? null : (p as SqlValue)));
}

/** Linhas viram objetos simples (node:sqlite devolve objetos sem protótipo). */
export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  const rows = db().prepare(sql).all(...clean(params)) as Record<string, unknown>[];
  return rows.map((r) => ({ ...r })) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  const row = db().prepare(sql).get(...clean(params)) as Record<string, unknown> | undefined;
  return row ? ({ ...row } as T) : undefined;
}

export function run(sql: string, ...params: unknown[]): { changes: number; lastId: number } {
  const r = db().prepare(sql).run(...clean(params));
  return { changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
}

export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN");
  try {
    const r = fn();
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
