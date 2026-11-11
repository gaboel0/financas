import "server-only";
import { all } from "../db";
import type { Bucket } from "@/lib/types";

export type Rule = { id: number; pattern: string; bucket: Bucket | null; category: string | null; matches: number };

export function listRules(): Rule[] {
  return all<Rule>(
    `SELECT r.id, r.pattern, r.bucket, r.category,
            (SELECT COUNT(*) FROM transactions t WHERE instr(lower(t.description), lower(r.pattern)) > 0) AS matches
     FROM tx_rules r ORDER BY r.id DESC`,
  );
}

/** Nomes de categoria já usados (do banco e das regras), para sugerir no formulário. */
export function categoryNames(): string[] {
  return all<{ n: string }>(
    `SELECT DISTINCT n FROM (
       SELECT pluggy_category AS n FROM transactions WHERE pluggy_category IS NOT NULL AND pluggy_category <> ''
       UNION SELECT category AS n FROM tx_rules WHERE category IS NOT NULL
     ) ORDER BY n COLLATE NOCASE`,
  ).map((r) => r.n);
}
