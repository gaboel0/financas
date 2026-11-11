import "server-only";
import { all, get } from "../db";
import { BUCKET_SQL } from "../pluggy/categoryMap";
import { incomeOf } from "../repo/incomes";
import { getSettings } from "../repo/settings";
import { getViewers } from "../repo/people";
import { monthlyFlow, txPeriod, type FlowPoint } from "../repo/transactions";
import { addMonths, currentMonth } from "@/lib/month";

/** Visão "Geral" da home: o histórico todo em vez de um mês. */
export type Geral = {
  from: string | null;
  to: string | null;
  months: number;
  /** entradas do mês = extrato + Pix seus vindos de fora do app (ou a renda cadastrada, se maior) */
  flow: FlowPoint[];
  entradas: number;
  /** entradas avulsas que aparecem no extrato (cashback, rendimentos, Pix de terceiros classificados como renda) */
  outrasEntradas: number;
  /** Pix no seu nome vindos de contas fora do app (ex.: conta do salário) */
  deFora: number;
  saidas: number;
  resultado: number;
  mediaEntradas: number;
  mediaSaidas: number;
  recorrencias: {
    items: { id: number; name: string; amount: number; scope: "house" | "personal"; dueDay: number }[];
    mensal: number;
    anual: number;
    pagoNoPeriodo: number;
  };
  cartoes: {
    cards: { id: string; name: string; bank: string | null; total: number; media: number }[];
    total: number;
    media: number;
    porMes: { month: string; amount: number }[];
    limite: number;
    disponivel: number;
  };
  moradia: {
    total: number;
    mediaMensal: number;
    pctMedio: number;
    ref: number;
    items: { name: string; total: number }[];
  };
};

export function getGeral(meId: number): Geral {
  const period = txPeriod();
  const end = currentMonth();
  const start = period.from ? period.from.slice(0, 7) : end;
  const [ys, ms] = start.split("-").map(Number);
  const [ye, me] = end.split("-").map(Number);
  const months = Math.max(1, Math.min((ye - ys) * 12 + (me - ms) + 1, 24));
  const extrato = monthlyFlow(end, months);
  const first = addMonths(end, -(months - 1));

  // Dinheiro que chegou de contas suas fora do app (ex.: a conta do salário): Pix no seu nome sem o par de saída aqui.
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const nameTokens = norm(getViewers().me.name).split(/\s+/).filter((t) => t.length >= 3);
  const nameParts = nameTokens.length >= 2 ? [nameTokens[0], nameTokens[nameTokens.length - 1]] : nameTokens;
  const inflowRows = all<{ m: string; description: string; amount: number }>(
    `SELECT substr(t.date, 1, 7) AS m, t.description, t.amount FROM transactions t JOIN accounts a ON a.id = t.account_id
     WHERE a.type = 'BANK' AND t.amount > 0 AND t.transfer_pair IS NULL AND t.date >= ? AND ${BUCKET_SQL} = 'ignorar'`,
    `${first}-01`,
  );
  const ownInflow = new Map<string, number>();
  for (const r of inflowRows) {
    const d = norm(r.description);
    if (nameParts.length && nameParts.every((p) => d.includes(p))) ownInflow.set(r.m, (ownInflow.get(r.m) ?? 0) + r.amount);
  }
  const deFora = [...ownInflow.values()].reduce((s, v) => s + v, 0);
  const outrasEntradas = extrato.reduce((s, f) => s + f.entradas, 0);
  // entradas do mês: o que entrou no extrato + o que veio das suas contas fora do app (ou a renda cadastrada, se for maior)
  const flow = extrato.map((f) => ({
    ...f,
    entradas: Math.max(f.entradas + (ownInflow.get(f.month) ?? 0), incomeOf(meId, f.month)),
  }));
  const entradas = flow.reduce((s, f) => s + f.entradas, 0);
  const saidas = flow.reduce((s, f) => s + f.saidas, 0);

  // Recorrências: custo das contas fixas ativas e o que já foi pago delas
  const bills = all<{ id: number; name: string; amount: number; scope: "house" | "personal"; dueDay: number }>(
    "SELECT id, name, amount_expected AS amount, scope, due_day AS dueDay FROM bills WHERE active = 1 ORDER BY amount_expected DESC",
  );
  const mensal = bills.reduce((s, b) => s + b.amount, 0);
  const pagoNoPeriodo =
    get<{ s: number | null }>("SELECT SUM(amount) AS s FROM bill_instances WHERE paid = 1 AND month >= ?", first)?.s ?? 0;

  // Cartões: tudo o que foi lançado (compras, sem os pagamentos de fatura) por cartão e por mês
  const cardRows = all<{ id: string; name: string; bank: string | null; m: string; total: number }>(
    `SELECT a.id, a.name, a.bank_name AS bank, substr(t.date, 1, 7) AS m,
            SUM(CASE WHEN t.amount > 0 AND ${BUCKET_SQL} = 'ignorar' THEN 0 ELSE -t.amount END) AS total
     FROM transactions t JOIN accounts a ON a.id = t.account_id
     WHERE a.type = 'CREDIT' AND t.date >= ? GROUP BY a.id, m`,
    `${first}-01`,
  );
  const byCard = new Map<string, { id: string; name: string; bank: string | null; total: number }>();
  const byMonth = new Map<string, number>();
  for (const r of cardRows) {
    const c = byCard.get(r.id) ?? { id: r.id, name: r.name, bank: r.bank, total: 0 };
    c.total += r.total;
    byCard.set(r.id, c);
    byMonth.set(r.m, (byMonth.get(r.m) ?? 0) + r.total);
  }
  const cards = [...byCard.values()]
    .map((c) => ({ ...c, total: Math.max(0, c.total), media: Math.max(0, Math.round(c.total / months)) }))
    .sort((a, b) => b.total - a.total);
  const cardTotal = cards.reduce((s, c) => s + c.total, 0);
  const lim = get<{ l: number | null; d: number | null }>(
    "SELECT SUM(credit_limit) AS l, SUM(available_limit) AS d FROM accounts WHERE type = 'CREDIT'",
  );

  // Moradia: o que foi pago das contas marcadas como moradia
  const housing = all<{ name: string; total: number }>(
    `SELECT b.name, SUM(bi.amount) AS total FROM bill_instances bi JOIN bills b ON b.id = bi.bill_id
     WHERE b.is_housing = 1 AND bi.paid = 1 AND bi.month >= ? GROUP BY b.id ORDER BY total DESC`,
    first,
  );
  const housingTotal = housing.reduce((s, h) => s + h.total, 0);
  const mediaMoradia = Math.round(housingTotal / months);
  const salario = incomeOf(meId, end);

  return {
    from: period.from,
    to: period.to,
    months,
    flow,
    entradas,
    outrasEntradas,
    deFora,
    saidas,
    resultado: entradas - saidas,
    mediaEntradas: Math.round(entradas / months),
    mediaSaidas: Math.round(saidas / months),
    recorrencias: { items: bills, mensal, anual: mensal * 12, pagoNoPeriodo },
    cartoes: {
      cards,
      total: cardTotal,
      media: Math.round(cardTotal / months),
      porMes: Array.from({ length: months }, (_, i) => {
        const m = addMonths(first, i);
        return { month: m, amount: Math.max(0, byMonth.get(m) ?? 0) };
      }),
      limite: lim?.l ?? 0,
      disponivel: lim?.d ?? 0,
    },
    moradia: {
      total: housingTotal,
      mediaMensal: mediaMoradia,
      pctMedio: salario > 0 ? mediaMoradia / salario : 0,
      ref: getSettings().moradiaRef,
      items: housing,
    },
  };
}
