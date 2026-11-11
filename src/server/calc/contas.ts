import "server-only";
import { listDebts } from "../repo/debts";
import { all, get, run, tx } from "../db";
import type { BillInstance } from "@/lib/types";
import { addDays, addMonths, currentMonth, dueDateOf, daysBetween, monthRange, todayISO } from "@/lib/month";

const INSTANCE_SELECT = `
  SELECT bi.id, bi.bill_id, bi.month, bi.amount, bi.due_date, bi.paid, bi.paid_at, bi.transaction_id,
         b.name, b.icon, b.category, b.scope, b.is_housing
  FROM bill_instances bi JOIN bills b ON b.id = bi.bill_id`;

/** Liga transações a contas pelo padrão de descrição (mesmo mês, valor ±15%) e marca como paga. */
export function autoMatch(month: string): number {
  const { from, to } = monthRange(month);
  const pending = all<{ id: number; amount: number; match_pattern: string }>(
    `SELECT bi.id, bi.amount, b.match_pattern FROM bill_instances bi JOIN bills b ON b.id = bi.bill_id
     WHERE bi.month = ? AND bi.transaction_id IS NULL AND bi.paid = 0 AND b.active = 1
       AND b.match_pattern IS NOT NULL AND TRIM(b.match_pattern) <> ''`,
    month,
  );
  let matched = 0;
  for (const p of pending) {
    // margem larga: contas variáveis (pedágio, luz) oscilam bastante; o texto do extrato já filtra
    const lo = Math.floor(p.amount * 0.6);
    const hi = Math.ceil(p.amount * 1.4);
    const t = get<{ id: string; amount: number; date: string }>(
      `SELECT id, amount, date FROM transactions
       WHERE date BETWEEN ? AND ? AND amount < 0 AND bill_instance_id IS NULL
         AND description LIKE ? AND -amount BETWEEN ? AND ?
       ORDER BY ABS(-amount - ?) LIMIT 1`,
      from, to, `%${p.match_pattern.trim()}%`, lo, hi, p.amount,
    );
    if (!t) continue;
    tx(() => {
      run("UPDATE transactions SET bill_instance_id = ? WHERE id = ?", p.id, t.id);
      run("UPDATE bill_instances SET transaction_id = ?, paid = 1, paid_at = ?, amount = ? WHERE id = ?", t.id, t.date, -t.amount, p.id);
    });
    matched++;
  }
  return matched;
}

/** Cria (lazy) as instâncias do mês para as contas ativas e roda o auto-match. */
export function ensureInstances(month: string): void {
  const bills = all<{ id: number; amount_expected: number; due_day: number }>(
    `SELECT id, amount_expected, due_day FROM bills WHERE active = 1
     AND id NOT IN (SELECT bill_id FROM bill_instances WHERE month = ?)`,
    month,
  );
  if (bills.length) {
    tx(() => {
      for (const b of bills) {
        run(
          "INSERT OR IGNORE INTO bill_instances (bill_id, month, amount, due_date) VALUES (?, ?, ?, ?)",
          b.id, month, b.amount_expected, dueDateOf(month, b.due_day),
        );
      }
    });
  }
  autoMatch(month);
}

export function listInstances(month: string): BillInstance[] {
  ensureInstances(month);
  return all<BillInstance>(
    `${INSTANCE_SELECT} WHERE bi.month = ? AND b.active = 1 ORDER BY bi.due_date, b.name`,
    month,
  );
}

export type DueChip = { day: number; total: number; paid: number; items: string[] };

export type ContasAPagar = {
  total: number;
  count: number;
  paidCount: number;
  paidAmount: number;
  next: { id: number; name: string; due_date: string; amount: number; days: number } | null;
  chips: DueChip[];
  instances: BillInstance[];
};

export function getContasAPagar(month: string): ContasAPagar {
  const instances = listInstances(month);
  const today = todayISO();
  const unpaid = instances.filter((i) => !i.paid);
  const nx = unpaid[0];
  const byDay = new Map<number, DueChip>();
  for (const i of instances) {
    const day = Number(i.due_date.slice(8, 10));
    const c = byDay.get(day) ?? { day, total: 0, paid: 0, items: [] };
    c.total += 1;
    c.paid += i.paid ? 1 : 0;
    c.items.push(i.name);
    byDay.set(day, c);
  }
  return {
    total: instances.reduce((s, i) => s + i.amount, 0),
    count: instances.length,
    paidCount: instances.length - unpaid.length,
    paidAmount: instances.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0),
    next: nx
      ? { id: nx.id, name: nx.name, due_date: nx.due_date, amount: nx.amount, days: daysBetween(today, nx.due_date) }
      : null,
    chips: [...byDay.values()].sort((a, b) => a.day - b.day),
    instances,
  };
}

export type Notification = {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  days: number; // negativo = atrasada
  overdue: boolean;
};

/** Contas não pagas com vencimento até hoje+7 (inclui atrasadas dos últimos meses). */
export function getNotifications(): Notification[] {
  const today = todayISO();
  const cm = currentMonth();
  ensureInstances(addMonths(cm, -1));
  ensureInstances(cm);
  ensureInstances(addMonths(cm, 1));
  const limit = addDays(today, 7);
  return all<BillInstance>(
    `${INSTANCE_SELECT} WHERE bi.paid = 0 AND b.active = 1 AND bi.due_date <= ? AND bi.due_date >= ?
     ORDER BY bi.due_date, b.name`,
    limit, addDays(today, -62),
  ).map((i) => {
    const days = daysBetween(today, i.due_date);
    return { id: i.id, name: i.name, amount: i.amount, due_date: i.due_date, days, overdue: days < 0 };
  }).concat(
    // dívidas avulsas em aberto vencendo em até 7 dias (ou atrasadas); id negativo pra não colidir com as contas
    listDebts().open
      .filter((d) => d.due_date && d.due_date <= limit && d.remaining > 0)
      .map((d) => ({ id: -d.id, name: `Dívida: ${d.creditor}`, amount: d.remaining, due_date: d.due_date!, days: d.days!, overdue: d.days! < 0 })),
  ).sort((a, b) => a.due_date.localeCompare(b.due_date));
}
