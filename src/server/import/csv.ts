import "server-only";
import { parseMoney } from "@/lib/format";
import type { ParsedTx } from "./ofx";

function splitLine(line: string, delim: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { cells.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function toISODate(s: string): string | null {
  const t = s.trim();
  let m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})-(\d{2})-(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/** CSV de extrato/fatura (separador ; ou ,). Retorna valores em centavos (negativo = saída). */
export function parseCSV(text: string, opts: { creditCard?: boolean } = {}): ParsedTx[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) && lines[0].includes(";") ? ";" : ",";
  const header = splitLine(lines[0], delim).map(norm);
  const find = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const iDate = find("data", "date");
  const iDesc = find("descri", "historico", "lancamento", "memo", "title", "estabelecimento", "nome");
  const iAmt = find("valor", "amount");
  const iDeb = find("debito", "saida");
  const iCred = find("credito", "entrada");
  if (iDate < 0 || (iAmt < 0 && iDeb < 0 && iCred < 0)) {
    throw new Error("CSV não reconhecido: preciso de colunas de data, descrição e valor.");
  }
  const rows: ParsedTx[] = [];
  for (const line of lines.slice(1)) {
    const c = splitLine(line, delim);
    const date = toISODate(c[iDate] ?? "");
    if (!date) continue;
    let amount: number;
    if (iAmt >= 0) amount = parseMoney(c[iAmt]);
    else amount = parseMoney(c[iCred] ?? "") - Math.abs(parseMoney(c[iDeb] ?? ""));
    rows.push({ date, description: (c[iDesc] ?? "Sem descrição").replace(/\s+/g, " ") || "Sem descrição", amount });
  }
  // faturas de cartão exportadas com compras positivas: inverte para saída negativa
  if (opts.creditCard && iAmt >= 0) {
    const pos = rows.filter((r) => r.amount > 0).length;
    const neg = rows.filter((r) => r.amount < 0).length;
    if (pos > neg) rows.forEach((r) => (r.amount = -r.amount));
  }
  return rows;
}
