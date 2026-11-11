import "server-only";
import { all } from "../db";
import { BUCKET_SQL } from "../pluggy/categoryMap";
import type { Account } from "@/lib/types";
import { addMonths, daysBetween, dueDateOf, dueMonthOf, monthShort, refMonthOf, todayISO } from "@/lib/month";

export { refMonthOf, dueMonthOf };

function monthDiff(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

type CardTx = {
  id: string; date: string; description: string; amount: number; bucket: string;
  installment_number: number | null; total_installments: number | null; total_amount: number | null;
  pluggy_category: string | null; bill_instance_id: number | null;
};

export type Parcela = { description: string; number: number; total: number; valor: number; restantes: number };

export type CardView = {
  account: Account;
  refMonth: string;
  dueMonth: string;
  /** A pagar no vencimento: fatura do mês (só as parcelas do mês) + sobra da anterior. */
  open: number;
  /** Parte do `open` que veio da fatura anterior não paga (ex.: pagou só o mínimo); 0 se pagou. */
  carryOver: number;
  limit: number | null;
  available: number | null;
  usedPct: number;
  projection: { month: string; label: string; amount: number; open: boolean }[];
  parcelas: Parcela[];
  recent: CardTx[];
  bills: { id: string; due_date: string | null; close_date: string | null; total_amount: number; ref_month: string | null; paid: number }[];
  /** Próximo fechamento/vencimento a partir de hoje (dias do cadastro ou da última fatura). */
  nextClose: string | null;
  nextDue: string | null;
  daysToDue: number | null;
};

/** Próximo vencimento >= hoje e o fechamento que vem antes dele. */
function nextDates(closeDay: number | null, dueDay: number | null): { nextClose: string | null; nextDue: string | null; daysToDue: number | null } {
  if (!dueDay) return { nextClose: null, nextDue: null, daysToDue: null };
  const today = todayISO();
  let m = today.slice(0, 7);
  if (dueDateOf(m, dueDay) < today) m = addMonths(m, 1);
  const nextDue = dueDateOf(m, dueDay);
  const nextClose = closeDay ? dueDateOf(closeDay < dueDay ? m : addMonths(m, -1), closeDay) : null;
  return { nextClose, nextDue, daysToDue: daysBetween(today, nextDue) };
}

export type CartoesView = {
  cards: CardView[];
  totalOpen: number;
  totalCarry: number;
  totalLimit: number;
  totalAvailable: number;
  projection: { month: string; label: string; amount: number; open: boolean }[];
};

function stripInstallment(desc: string): string {
  return desc.replace(/\s*\(?\b\d{1,2}\s*(?:\/|de)\s*\d{1,2}\b\)?\s*$/i, "").trim();
}

function buildCard(a: Account, month: string): CardView {
  const since = addMonths(month, -14) + "-01";
  const txs = all<CardTx>(
    `SELECT t.id, t.date, t.description, t.amount, ${BUCKET_SQL} AS bucket, t.installment_number,
            t.total_installments, t.total_amount, t.pluggy_category, t.bill_instance_id
     FROM transactions t WHERE t.account_id = ? AND t.date >= ? ORDER BY t.date DESC, t.id`,
    a.id, since,
  );
  const bills = all<CardView["bills"][number]>(
    "SELECT id, due_date, close_date, total_amount, ref_month, paid FROM card_bills WHERE account_id = ? ORDER BY due_date DESC LIMIT 4",
    a.id,
  );
  // dias de fechamento/vencimento: do cadastro ou da última fatura que o banco mandou
  const lastBill = bills.find((b) => b.due_date);
  const closeDay = a.close_day ?? (lastBill?.close_date ? Number(lastBill.close_date.slice(8, 10)) : null);
  const dueDay = a.due_day ?? (lastBill?.due_date ? Number(lastBill.due_date.slice(8, 10)) : null);

  const ref = (d: string) => refMonthOf(d, closeDay);

  // Parcelamento de fatura feito no banco: a fatura do 1º mês vira a 1ª parcela e as próximas somam nas seguintes.
  // As linhas de parcelamento que o banco lançar depois são ignoradas para não contar em dobro.
  const plans = all<{ description: string; installment: number; total: number; first_ref: string }>(
    "SELECT description, installment, total, first_ref FROM card_plans WHERE account_id = ?", a.id,
  );
  const PLAN_TX = /parc(?:\.|elamento)?\s*(?:de\s*)?(?:saldo\s*(?:de\s*)?)?fatura/i;
  const planK = (p: (typeof plans)[number], m: string) => monthDiff(p.first_ref, m);
  const planAmount = (m: string) => plans.reduce((s, p) => {
    const k = planK(p, m);
    return k >= 0 && k < p.total ? s + p.installment : s;
  }, 0);
  const replacedBy = (m: string) => plans.some((p) => p.first_ref === m);
  const usedTxs = plans.length ? txs.filter((t) => !PLAN_TX.test(t.description)) : txs;
  /** Pagamento da fatura (crédito classificado como "ignorar"): não é compra. */
  const isPayment = (t: CardTx) => t.amount > 0 && t.bucket === "ignorar";
  /** Linha "TOTAL DA FATURA ANTERIOR" (Caixa): só repete o saldo da fatura passada, não é compra. */
  const isCarryover = (t: CardTx) => /^total da fatura anterior/i.test(t.description);
  /** O que foi lançado na fatura do mês m: compras (inclusive as que o orçamento ignora) menos estornos, sem os pagamentos. */
  const posted = (m: string) => -usedTxs.filter((t) => ref(t.date) === m && !isPayment(t) && !isCarryover(t)).reduce((s, t) => s + t.amount, 0);

  // parcelamentos: última parcela vista de cada compra
  const series = new Map<string, CardTx>();
  for (const t of usedTxs) {
    if (!t.total_installments || t.total_installments < 2 || !t.installment_number) continue;
    const key = `${stripInstallment(t.description).toLowerCase()}|${t.total_installments}`;
    const cur = series.get(key);
    if (!cur || t.installment_number > (cur.installment_number ?? 0)) series.set(key, t);
  }
  const parcelas: Parcela[] = [...series.values()]
    .map((t) => ({
      description: stripInstallment(t.description),
      number: t.installment_number!,
      total: t.total_installments!,
      valor: t.total_amount ? Math.round(t.total_amount / t.total_installments!) : Math.abs(t.amount),
      restantes: t.total_installments! - t.installment_number!,
    }))
    .filter((p) => p.restantes > 0)
    .concat(plans.flatMap((p) => {
      const k = planK(p, month);
      return k >= 0 && k < p.total
        ? [{ description: p.description, number: k + 1, total: p.total, valor: p.installment, restantes: p.total - k - 1 }]
        : [];
    }));

  /** Parcelas que devem cair na fatura do mês m e ainda não apareceram (só a parcela do mês, nunca o total da compra). */
  const pendingInstallments = (m: string) => {
    let sum = 0;
    for (const [, t] of series) {
      const lastRef = ref(t.date);
      const num = t.installment_number! + monthDiff(lastRef, m);
      if (num > t.installment_number! && num <= t.total_installments!) {
        sum += t.total_amount ? Math.round(t.total_amount / t.total_installments!) : Math.abs(t.amount);
      }
    }
    return sum;
  };

  /** Valor da fatura do mês: o que já foi lançado + parcelas que ainda vão cair nela. */
  const invoice = (m: string) =>
    replacedBy(m) ? planAmount(m) : Math.max(0, posted(m) + pendingInstallments(m)) + planAmount(m);

  // fatura anterior paga só em parte (ex.: só o mínimo): o resto rola para esta, com juros
  let carryOver = 0;
  const prevBill = bills.find((b) => b.due_date && b.close_date && dueMonthOf(addMonths(month, -1), closeDay, dueDay) === b.due_date.slice(0, 7));
  const planActive = plans.some((p) => planK(p, month) >= 0 && planK(p, month) < p.total);
  if (prevBill && prevBill.total_amount > 0 && !planActive) {
    const paidAfter = txs.filter((t) => isPayment(t) && t.date > prevBill.close_date!).reduce((s, t) => s + t.amount, 0);
    if (paidAfter < prevBill.total_amount * 0.5) carryOver = prevBill.total_amount - paidAfter;
  }

  /** O que você paga no vencimento: fatura do mês + o que sobrou da anterior. */
  const open = invoice(month) + carryOver;

  // assinaturas: compras recorrentes (bucket pessoal, sem parcelas) dos últimos 2 meses de fatura
  const subs = new Map<string, number>();
  for (const t of txs) {
    if (t.bucket !== "pessoal" || t.amount >= 0 || t.total_installments) continue;
    const r = ref(t.date);
    if (r !== month && r !== addMonths(month, -1)) continue;
    const k = t.description.toLowerCase();
    if (!subs.has(k)) subs.set(k, -t.amount);
  }

  const projection = [0, 1, 2].map((k) => {
    const target = addMonths(month, k);
    const due = dueMonthOf(target, closeDay, dueDay);
    let amount = k === 0 ? open : invoice(target);
    if (k > 0) {
      const actualDescs = new Set(txs.filter((t) => ref(t.date) === target).map((t) => t.description.toLowerCase()));
      for (const [desc, val] of subs) if (!actualDescs.has(desc)) amount += val;
    }
    return { month: target, label: `${monthShort(due)}${k === 0 ? " (aberta)" : ""}`, amount, open: k === 0 };
  });

  const limit = a.credit_limit;
  const available = a.available_limit ?? (limit !== null ? Math.max(limit - open, 0) : null);
  return {
    ...nextDates(closeDay, dueDay),
    account: a,
    refMonth: month,
    dueMonth: dueMonthOf(month, closeDay, dueDay),
    open,
    carryOver,
    limit,
    available,
    usedPct: limit && limit > 0 ? Math.min(Math.max((limit - (available ?? limit)) / limit, 0), 1) : 0,
    projection,
    parcelas,
    recent: txs.slice(0, 8),
    bills,
  };
}

export function getCartoes(month: string): CartoesView {
  const accounts = all<Account>("SELECT * FROM accounts WHERE type = 'CREDIT' ORDER BY name");
  const cards = accounts.map((a) => buildCard(a, month));
  const projection = [0, 1, 2].map((k) => ({
    month: addMonths(month, k),
    label: cards[0]?.projection[k].label ?? monthShort(addMonths(month, k)),
    amount: cards.reduce((s, c) => s + c.projection[k].amount, 0),
    open: k === 0,
  }));
  return {
    cards,
    totalOpen: cards.reduce((s, c) => s + c.open, 0),
    totalCarry: cards.reduce((s, c) => s + c.carryOver, 0),
    totalLimit: cards.reduce((s, c) => s + (c.limit ?? 0), 0),
    totalAvailable: cards.reduce((s, c) => s + (c.available ?? 0), 0),
    projection,
  };
}
