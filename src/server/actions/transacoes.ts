"use server";

import { get, run } from "../db";
import { parseMoney } from "@/lib/format";
import { todayISO } from "@/lib/month";
import type { Bucket } from "@/lib/types";
import { ensureManualAccount } from "../repo/accounts";
import { getViewers } from "../repo/people";
import { autoMatch } from "../calc/contas";
import { fail, str, wrap, type ActionResult } from "./util";

const BUCKETS = ["dia_a_dia", "pessoal", "casa", "renda", "ignorar"];

export async function addTransaction(fd: FormData): Promise<ActionResult> {
  const description = str(fd, "description");
  const value = Math.abs(parseMoney(str(fd, "amount")));
  const date = str(fd, "date") || todayISO();
  if (!description) return fail("Informe uma descrição.");
  if (!value) return fail("Informe um valor maior que zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Data inválida.");
  return wrap(() => {
    const personId = getViewers().me.id;
    let accountId = str(fd, "account_id");
    if (!accountId || !get("SELECT 1 AS x FROM accounts WHERE id = ?", accountId)) accountId = ensureManualAccount(personId).id;
    const entrada = str(fd, "kind") === "entrada";
    const bucket = str(fd, "bucket");
    run(
      `INSERT INTO transactions (id, account_id, date, description, amount, bucket_override, status, person_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'POSTED', ?, ?)`,
      `man_${crypto.randomUUID()}`, accountId, date, description, entrada ? value : -value,
      BUCKETS.includes(bucket) ? bucket : entrada ? "renda" : null, personId, new Date().toISOString(),
    );
    autoMatch(date.slice(0, 7));
  });
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  return wrap(() => {
    const t = get<{ bill_instance_id: number | null }>("SELECT bill_instance_id FROM transactions WHERE id = ?", id);
    if (t?.bill_instance_id) run("UPDATE bill_instances SET transaction_id = NULL, paid = 0, paid_at = NULL WHERE transaction_id = ?", id);
    run("UPDATE transactions SET transfer_pair = NULL WHERE transfer_pair = ?", id);
    run("DELETE FROM transactions WHERE id = ?", id);
  });
}

/** Define o bucket de uma transação ("auto" volta ao mapa de categorias). */
export async function setBucket(id: string, bucket: Bucket | "auto"): Promise<ActionResult> {
  return wrap(() => {
    run("UPDATE transactions SET bucket_override = ? WHERE id = ?", bucket === "auto" ? null : bucket, id);
  });
}

export async function setCategoryBucket(categoryId: string, bucket: Bucket): Promise<ActionResult> {
  return wrap(() => {
    if (!BUCKETS.includes(bucket)) throw new Error("Bucket inválido.");
    run("UPDATE category_map SET bucket = ? WHERE pluggy_category_id = ?", bucket, categoryId);
  });
}
