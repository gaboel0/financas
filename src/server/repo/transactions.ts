import "server-only";
import { all } from "../db";
import { BUCKET_SQL, CATEGORY_SQL } from "../pluggy/categoryMap";
import type { Bucket, Transaction } from "@/lib/types";
import { addMonths, monthRange } from "@/lib/month";
import { catLabel } from "@/lib/categories";
import { cleanMerchant } from "@/lib/merchant";

export type TxRow = Transaction & {
  bucket: Bucket;
  account_name: string;
  account_type: "BANK" | "CREDIT";
  bank_name: string | null;
  bill_name: string | null;
  category: string;
};

export type TxFilter = {
  /** Sem busca/período, mostra o mês. Com busca e sem período, procura em tudo. */
  month: string;
  q?: string;
  accountId?: string;
  kind?: "entrada" | "saida";
  bucket?: string;
  from?: string;
  to?: string;
  limit?: number;
};

function txWhere(f: TxFilter): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  const hasPeriod = !!(f.from || f.to);
  if (hasPeriod) {
    if (f.from) { conds.push("t.date >= ?"); params.push(f.from); }
    if (f.to) { conds.push("t.date <= ?"); params.push(f.to); }
  } else if (!f.q) {
    const { from, to } = monthRange(f.month);
    conds.push("t.date BETWEEN ? AND ?");
    params.push(from, to);
  }
  if (f.q) {
    // texto ou valor ("45,90" / "45.90")
    const cents = /^\d+([.,]\d{1,2})?$/.test(f.q) ? Math.round(Number(f.q.replace(",", ".")) * 100) : null;
    conds.push(`(instr(lower(t.description), lower(?)) > 0 OR instr(lower(${CATEGORY_SQL}), lower(?)) > 0${cents ? " OR abs(t.amount) = ?" : ""})`);
    params.push(f.q, f.q);
    if (cents) params.push(cents);
  }
  if (f.accountId) { conds.push("t.account_id = ?"); params.push(f.accountId); }
  if (f.kind === "entrada") conds.push("t.amount > 0");
  if (f.kind === "saida") conds.push("t.amount < 0");
  if (f.bucket) { conds.push(`${BUCKET_SQL} = ?`); params.push(f.bucket); }
  return { where: conds.length ? conds.join(" AND ") : "1 = 1", params };
}

export function listTransactions(f: TxFilter): TxRow[] {
  const { where, params } = txWhere(f);
  return all<TxRow>(
    `SELECT t.*, ${BUCKET_SQL} AS bucket, ${CATEGORY_SQL} AS category, a.name AS account_name, a.type AS account_type, a.bank_name AS bank_name,
            (SELECT b.name FROM bill_instances bi JOIN bills b ON b.id = bi.bill_id WHERE bi.id = t.bill_instance_id) AS bill_name
     FROM transactions t JOIN accounts a ON a.id = t.account_id
     WHERE ${where} ORDER BY t.date DESC, t.created_at DESC, t.id DESC LIMIT ${f.limit ?? 500}`,
    ...params,
  );
}

/**
 * Totais do filtro inteiro (não só das linhas exibidas). Por padrão sem "ignorar" (transferências, faturas);
 * com `raw`, soma tudo como no extrato do banco.
 */
export function txTotals(f: TxFilter, raw = false): { count: number; entradas: number; saidas: number } {
  const { where, params } = txWhere(f);
  const keep = raw ? "1 = 1" : `${BUCKET_SQL} <> 'ignorar'`;
  const r = all<{ count: number; entradas: number | null; saidas: number | null }>(
    `SELECT COUNT(*) AS count,
            SUM(CASE WHEN t.amount > 0 AND ${keep} THEN t.amount ELSE 0 END) AS entradas,
            SUM(CASE WHEN t.amount < 0 AND ${keep} THEN -t.amount ELSE 0 END) AS saidas
     FROM transactions t WHERE ${where}`,
    ...params,
  )[0];
  return { count: r?.count ?? 0, entradas: r?.entradas ?? 0, saidas: r?.saidas ?? 0 };
}

export type FlowPoint = { month: string; entradas: number; saidas: number };

/** Entradas e saídas (sem "ignorar") dos últimos n meses, . */
export function monthlyFlow(endMonth: string, n = 6): FlowPoint[] {
  const start = addMonths(endMonth, -(n - 1));
  const rows = all<{ m: string; entradas: number; saidas: number }>(
    `SELECT substr(t.date, 1, 7) AS m,
            SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS entradas,
            SUM(CASE WHEN t.amount < 0 THEN -t.amount ELSE 0 END) AS saidas
     FROM transactions t WHERE t.date >= ? AND t.date <= ? AND ${BUCKET_SQL} <> 'ignorar'
     GROUP BY m`,
    `${start}-01`, monthRange(endMonth).to,
  );
  const map = new Map(rows.map((r) => [r.m, r]));
  return Array.from({ length: n }, (_, i) => {
    const m = addMonths(start, i);
    const r = map.get(m);
    return { month: m, entradas: r?.entradas ?? 0, saidas: r?.saidas ?? 0 };
  });
}

export type Merchant = { name: string; total: number; count: number };
/** `name` já em português; `raw` são os nomes originais (para filtrar no Fluxo). */
export type CategoryTotal = { name: string; raw: string[]; total: number; count: number; merchants: Merchant[] };

/** Saídas por categoria (sem "ignorar" e "renda"), maiores primeiro, com os estabelecimentos de cada uma. Sem mês = todo o período. */
export function categoryTotals(month: string | null): CategoryTotal[] {
  const { from, to } = month ? monthRange(month) : { from: "0000-01-01", to: "9999-12-31" };
  const rows = all<{ cat: string; description: string; amount: number }>(
    `SELECT ${CATEGORY_SQL} AS cat, t.description, -t.amount AS amount FROM transactions t
     WHERE t.date BETWEEN ? AND ? AND t.amount < 0 AND ${BUCKET_SQL} NOT IN ('ignorar', 'renda')`,
    from, to,
  );
  const cats = new Map<string, { raw: Set<string>; total: number; count: number; merchants: Map<string, Merchant> }>();
  for (const r of rows) {
    const label = catLabel(r.cat);
    const c = cats.get(label) ?? { raw: new Set<string>(), total: 0, count: 0, merchants: new Map<string, Merchant>() };
    c.raw.add(r.cat);
    c.total += r.amount;
    c.count++;
    const m = cleanMerchant(r.description);
    const key = m.toLowerCase();
    const cur = c.merchants.get(key) ?? { name: m, total: 0, count: 0 };
    cur.total += r.amount;
    cur.count++;
    c.merchants.set(key, cur);
    cats.set(label, c);
  }
  return [...cats.entries()]
    .map(([name, c]) => ({
      name,
      raw: [...c.raw],
      total: c.total,
      count: c.count,
      merchants: [...c.merchants.values()].sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

export type BucketTotal = { bucket: Bucket; total: number };

/** Primeiro e último dia com transação (para o rótulo do período "geral"). */
export function txPeriod(): { from: string | null; to: string | null } {
  return all<{ from: string | null; to: string | null }>("SELECT MIN(date) AS \"from\", MAX(date) AS \"to\" FROM transactions")[0] ?? { from: null, to: null };
}

export function bucketTotals(month: string): BucketTotal[] {
  const { from, to } = monthRange(month);
  return all<BucketTotal>(
    `SELECT ${BUCKET_SQL} AS bucket, SUM(-t.amount) AS total FROM transactions t
     WHERE t.date BETWEEN ? AND ? AND t.amount < 0 GROUP BY bucket ORDER BY total DESC`,
    from, to,
  );
}
