import "server-only";
import { all } from "../db";
import { currentMonth, daysBetween, monthRange, todayISO } from "@/lib/month";

export type DebtPayment = { id: number; debt_id: number; date: string; amount: number };

export type Debt = {
  id: number;
  creditor: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  settled_at: string | null;
  paid: number;
  remaining: number;
  /** dias até o vencimento (negativo = atrasada); null sem vencimento */
  days: number | null;
  payments: DebtPayment[];
};

export function listDebts(): { open: Debt[]; settled: Debt[]; totalOpen: number } {
  const rows = all<Omit<Debt, "remaining" | "days" | "payments">>(
    `SELECT d.*, COALESCE((SELECT SUM(p.amount) FROM debt_payments p WHERE p.debt_id = d.id), 0) AS paid FROM debts d`,
  );
  const payments = all<DebtPayment>("SELECT * FROM debt_payments ORDER BY date DESC, id DESC");
  const today = todayISO();
  const debts: Debt[] = rows.map((d) => ({
    ...d,
    remaining: Math.max(d.amount - d.paid, 0),
    days: d.due_date ? daysBetween(today, d.due_date) : null,
    payments: payments.filter((p) => p.debt_id === d.id),
  }));
  const open = debts
    .filter((d) => !d.settled_at)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.creditor.localeCompare(b.creditor));
  const settled = debts
    .filter((d) => d.settled_at)
    .sort((a, b) => (b.settled_at ?? "").localeCompare(a.settled_at ?? ""));
  return { open, settled, totalOpen: open.reduce((s, d) => s + d.remaining, 0) };
}

/** Dívidas em aberto que pesam no mês: vencem nele (ou já venceram, se for o mês atual). */
export function debtsDueInMonth(month: string): { name: string; value: number }[] {
  const { from, to } = monthRange(month);
  const isCurrent = month === currentMonth();
  return listDebts()
    .open.filter((d) => d.due_date && d.due_date <= to && (d.due_date >= from || isCurrent))
    .map((d) => ({ name: d.creditor, value: d.remaining }))
    .filter((d) => d.value > 0);
}
