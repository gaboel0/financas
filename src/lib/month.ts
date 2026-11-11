export const TZ = "America/Sao_Paulo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function isMonth(m: unknown): m is string {
  return typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export function parseMonth(m?: string | string[] | null): string {
  const v = Array.isArray(m) ? m[0] : m;
  return isMonth(v) ? v : currentMonth();
}

export function addMonths(m: string, n: number): string {
  const [y, mo] = m.split("-").map(Number);
  const idx = y * 12 + (mo - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return `${MESES[mo - 1]} de ${y}`;
}

export function monthName(m: string): string {
  const [, mo] = m.split("-").map(Number);
  return MESES[mo - 1];
}

export function monthShort(m: string): string {
  const n = monthName(m).slice(0, 3);
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function daysInMonth(m: string): number {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

export function dueDateOf(m: string, day: number): string {
  const d = Math.min(Math.max(1, day), daysInMonth(m));
  return `${m}-${String(d).padStart(2, "0")}`;
}

export function monthRange(m: string): { from: string; to: string } {
  return { from: `${m}-01`, to: `${m}-${String(daysInMonth(m)).padStart(2, "0")}` };
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.UTC(+fromISO.slice(0, 4), +fromISO.slice(5, 7) - 1, +fromISO.slice(8, 10));
  const b = Date.UTC(+toISO.slice(0, 4), +toISO.slice(5, 7) - 1, +toISO.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}

/** Mês da fatura (mês de fechamento): compra até o dia de fechamento cai na fatura do mês, depois na próxima. */
export function refMonthOf(date: string, closeDay: number | null): string {
  const m = date.slice(0, 7);
  const d = Number(date.slice(8, 10));
  if (!closeDay) return m;
  return d <= closeDay ? m : addMonths(m, 1);
}

/** Mês do vencimento da fatura de um mês de referência. */
export function dueMonthOf(ref: string, closeDay: number | null, dueDay: number | null): string {
  if (!closeDay || !dueDay) return ref;
  return dueDay <= closeDay ? addMonths(ref, 1) : ref;
}

