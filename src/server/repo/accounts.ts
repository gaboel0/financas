import "server-only";
import { all, get, run } from "../db";
import type { Account } from "@/lib/types";

export function listAccounts(type?: "BANK" | "CREDIT"): Account[] {
  return type
    ? all<Account>("SELECT * FROM accounts WHERE type = ? ORDER BY name", type)
    : all<Account>("SELECT * FROM accounts ORDER BY type, name");
}

export function getAccount(id: string): Account | undefined {
  return get<Account>("SELECT * FROM accounts WHERE id = ?", id);
}

/** Conta usada para lançamentos manuais/importações sem conta definida. */
export function ensureManualAccount(ownerId: number | null): Account {
  const existing = get<Account>(
    "SELECT * FROM accounts WHERE source = 'manual' AND type = 'BANK' ORDER BY (owner_person_id = ?) DESC LIMIT 1",
    ownerId,
  );
  if (existing) return existing;
  const id = `manual_${crypto.randomUUID()}`;
  run(
    "INSERT INTO accounts (id, source, type, name, bank_name, color, owner_person_id) VALUES (?, 'manual', 'BANK', 'Conta manual', 'Manual', 'slate', ?)",
    id, ownerId,
  );
  return getAccount(id)!;
}
