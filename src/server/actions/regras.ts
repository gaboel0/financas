"use server";

import { run } from "../db";
import { fail, str, wrap, type ActionResult } from "./util";

const BUCKETS = ["dia_a_dia", "pessoal", "casa", "renda", "ignorar"];

/** Regra: toda transação cuja descrição contém `pattern` recebe a classificação e/ou categoria. Vale para as antigas e as que chegarem. */
export async function createRule(fd: FormData): Promise<ActionResult> {
  const pattern = str(fd, "pattern");
  const bucket = str(fd, "bucket");
  const category = str(fd, "category");
  if (pattern.length < 2) return fail("Informe pelo menos 2 letras do texto.");
  if (!bucket && !category) return fail("Escolha uma classificação ou uma categoria.");
  if (bucket && !BUCKETS.includes(bucket)) return fail("Classificação inválida.");
  return wrap(() => {
    run(
      "INSERT INTO tx_rules (pattern, bucket, category, created_at) VALUES (?, ?, ?, ?)",
      pattern, bucket || null, category || null, new Date().toISOString(),
    );
  });
}

export async function deleteRule(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("DELETE FROM tx_rules WHERE id = ?", id);
  });
}
