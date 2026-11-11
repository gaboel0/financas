import { formatDateBR } from "./format";

/** Rótulo e cor do vencimento de uma dívida (null quando não tem data). */
export function dueLabel(d: { days: number | null; due_date: string | null }): { text: string; tone: "rose" | "amber" | "slate" } | null {
  if (d.days === null || !d.due_date) return null;
  if (d.days < 0) return { text: `atrasada há ${-d.days} ${d.days === -1 ? "dia" : "dias"}`, tone: "rose" };
  if (d.days === 0) return { text: "vence hoje", tone: "rose" };
  if (d.days <= 7) return { text: `vence em ${d.days} ${d.days === 1 ? "dia" : "dias"}`, tone: "amber" };
  return { text: `vence ${formatDateBR(d.due_date)}`, tone: "slate" };
}
