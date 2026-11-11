import "server-only";
import { all } from "../db";
import { BUCKET_SQL, CATEGORY_SQL } from "../pluggy/categoryMap";
import { catLabel } from "@/lib/categories";
import { daysBetween, monthRange, todayISO } from "@/lib/month";

export type GastoTx = { id: string; date: string; description: string; amount: number; category: string; account: string | null };

export type GastoAteAgora = {
  from: string;
  /** hoje, no mês atual; o último dia, em meses passados */
  to: string;
  emAndamento: boolean;
  total: number;
  dias: number;
  mediaDia: number;
  txs: GastoTx[];
  categorias: { nome: string; total: number; count: number }[];
  porDia: { date: string; total: number }[];
};

/**
 * O que já saiu de verdade no mês até hoje: compras no débito/cartão, contas pagas, Pix de pagamento.
 * Fica de fora o que não é gasto (transferência entre contas próprias, pagamento de fatura, renda).
 */
export function getGastoAteAgora(month: string, personId: number): GastoAteAgora {
  const range = monthRange(month);
  const today = todayISO();
  const emAndamento = today >= range.from && today <= range.to;
  const to = emAndamento ? today : range.to;
  const futuro = range.from > today;

  const txs = futuro ? [] : all<GastoTx & { category: string }>(
    `SELECT t.id, t.date, t.description, -t.amount AS amount, ${CATEGORY_SQL} AS category, a.name AS account
     FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
     WHERE t.date BETWEEN ? AND ? AND t.amount < 0 AND (t.person_id = ? OR t.person_id IS NULL)
       AND ${BUCKET_SQL} NOT IN ('ignorar', 'renda')
     ORDER BY t.date DESC, t.amount ASC`,
    range.from, to, personId,
  ).map((t) => ({ ...t, category: catLabel(t.category) }));

  const total = txs.reduce((s, t) => s + t.amount, 0);
  const cats = new Map<string, { total: number; count: number }>();
  const dias = new Map<string, number>();
  for (const t of txs) {
    const c = cats.get(t.category) ?? { total: 0, count: 0 };
    cats.set(t.category, { total: c.total + t.amount, count: c.count + 1 });
    dias.set(t.date, (dias.get(t.date) ?? 0) + t.amount);
  }
  const nDias = futuro ? 0 : daysBetween(range.from, to) + 1;
  const porDia = Array.from({ length: nDias }, (_, i) => {
    const d = new Date(Date.UTC(+range.from.slice(0, 4), +range.from.slice(5, 7) - 1, 1 + i)).toISOString().slice(0, 10);
    return { date: d, total: dias.get(d) ?? 0 };
  });

  return {
    from: range.from, to, emAndamento, total,
    dias: nDias,
    mediaDia: nDias ? Math.round(total / nDias) : 0,
    txs,
    categorias: [...cats].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.total - a.total),
    porDia,
  };
}
