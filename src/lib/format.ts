const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const intFmt = new Intl.NumberFormat("pt-BR");

/** Centavos -> "R$ 5.304,28" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** Centavos -> partes para exibir valor grande: { neg, int: "5.304", dec: "28" } */
export function splitMoney(cents: number): { neg: boolean; int: string; dec: string } {
  const abs = Math.abs(Math.round(cents));
  const int = Math.floor(abs / 100);
  const dec = String(abs % 100).padStart(2, "0");
  return { neg: cents < 0 && abs > 0, int: intFmt.format(int), dec };
}

/** "5.304,28" / "5304.28" / "R$ 1.234" -> centavos */
export function parseMoney(input: string | null | undefined): number {
  if (!input) return 0;
  let s = String(input).replace(/[R$\s]/g, "");
  if (!s) return 0;
  const neg = s.startsWith("-") || /^\(.*\)$/.test(s);
  s = s.replace(/[-()+]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  } else if (lastDot > -1) {
    // "1.234" (milhar) vs "12.50" (decimal)
    const decimals = s.length - lastDot - 1;
    if (decimals === 3 && s.indexOf(".") === lastDot) s = s.replace(".", "");
    else if (s.split(".").length > 2) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  const cents = Math.round(n * 100);
  return neg ? -cents : cents;
}

export function formatPct(ratio: number, digits = 0): string {
  return `${(ratio * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
