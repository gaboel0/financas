import "server-only";
import { all } from "../db";
import { brHolidays } from "@/lib/holidays";
import { addDays, monthRange } from "@/lib/month";

export type CalEventKind = "ferias" | "folga" | "feriado" | "evento";
export type CalEvent = { id: number; kind: CalEventKind; title: string | null; start_date: string; end_date: string };

export type DayItem = {
  type: "feriado" | "ferias" | "folga" | "evento" | "conta" | "fatura" | "viagem";
  label: string;
  /** contas: valor e se já foi paga */
  amount?: number;
  paid?: boolean;
  optional?: boolean;
  eventId?: number;
};

const isWeekend = (d: string) => [0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay());

function eventsBetween(from: string, to: string): CalEvent[] {
  return all<CalEvent>(
    "SELECT id, kind, title, start_date, end_date FROM calendar_events WHERE start_date <= ? AND end_date >= ? ORDER BY start_date",
    to, from,
  );
}

function holidaysBetween(from: string, to: string) {
  const ys = new Set([+from.slice(0, 4), +to.slice(0, 4)]);
  return [...ys].flatMap(brHolidays).filter((h) => h.date >= from && h.date <= to);
}

/** Dias sem trabalho (férias, folga, feriado que não é ponto facultativo) entre duas datas, com o motivo. */
export function offDays(from: string, to: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const h of holidaysBetween(from, to)) if (!h.optional) out.set(h.date, h.name);
  for (const e of eventsBetween(from, to)) {
    if (e.kind === "evento") continue;
    for (let d = e.start_date < from ? from : e.start_date; d <= e.end_date && d <= to; d = addDays(d, 1)) {
      out.set(d, e.kind === "ferias" ? "férias" : e.title || (e.kind === "folga" ? "folga" : "feriado"));
    }
  }
  return out;
}

/** A semana (que começa na segunda) é inteira de folga, de seg a sex? Retorna o motivo ou null. */
export function weekOff(monday: string, off: Map<string, string>): string | null {
  const uteis = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => !isWeekend(d));
  if (!uteis.every((d) => off.has(d))) return null;
  const motivos = new Set(uteis.map((d) => off.get(d)!));
  return motivos.has("férias") ? "férias" : [...motivos][0];
}

/** Tudo que cai em cada dia do mês: feriados, férias/folgas/eventos, contas fixas, faturas e viagens. */
export function getCalendar(month: string) {
  const { from, to } = monthRange(month);
  const days: Record<string, DayItem[]> = {};
  const push = (d: string, it: DayItem) => {
    if (d < from || d > to) return;
    (days[d] ??= []).push(it);
  };
  const range = (a: string, b: string, it: DayItem) => {
    for (let d = a < from ? from : a; d <= b && d <= to; d = addDays(d, 1)) push(d, it);
  };

  for (const h of holidaysBetween(from, to)) push(h.date, { type: "feriado", label: h.name, optional: h.optional });
  const events = eventsBetween(from, to);
  const KIND_LABEL = { ferias: "Férias", folga: "Folga", feriado: "Feriado", evento: "Evento" } as const;
  for (const e of events) range(e.start_date, e.end_date, { type: e.kind, label: e.title || KIND_LABEL[e.kind], eventId: e.id });

  for (const b of all<{ name: string; amount: number; due_date: string; paid: number }>(
    `SELECT b.name, i.amount, i.due_date, i.paid FROM bill_instances i JOIN bills b ON b.id = i.bill_id
     WHERE i.due_date BETWEEN ? AND ?`, from, to,
  )) push(b.due_date, { type: "conta", label: b.name, amount: b.amount, paid: !!b.paid });

  const last = +to.slice(8, 10);
  for (const c of all<{ bank: string; due_day: number }>(
    `SELECT COALESCE(bank_name, name) AS bank, MAX(due_day) AS due_day FROM accounts
     WHERE type = 'CREDIT' AND due_day IS NOT NULL GROUP BY COALESCE(bank_name, name)`,
  )) push(`${month}-${String(Math.min(c.due_day, last)).padStart(2, "0")}`, { type: "fatura", label: `Fatura ${c.bank}` });

  for (const t of all<{ name: string; start_date: string; end_date: string | null }>(
    "SELECT name, start_date, end_date FROM trips WHERE start_date IS NOT NULL AND start_date <= ? AND COALESCE(end_date, start_date) >= ?",
    to, from,
  )) range(t.start_date, t.end_date ?? t.start_date, { type: "viagem", label: t.name });

  return { from, to, days, events };
}
