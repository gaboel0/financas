import "server-only";
import { get } from "../db";
import { BUCKET_SQL } from "../pluggy/categoryMap";
import { incomeOf } from "../repo/incomes";
import { getSettings } from "../repo/settings";
import { monthRange } from "@/lib/month";
import { listInstances } from "./contas";
import { debtsDueInMonth } from "../repo/debts";

export type Segment = { key: string; label: string; value: number; kind: "casa" | "pessoal" | "divida" | "dia" | "sobra" };

export type SaldoPrevisto = {
  salario: number;
  casa: number;
  pessoais: number;
  dividas: number;
  diaADia: number;
  diaADiaReal: number;
  diaADiaBudget: number;
  saldo: number;
  pctLivre: number; // 0..1 (pode ser negativo)
  segments: Segment[];
  casaItems: { name: string; value: number }[];
  pessoaisItems: { name: string; value: number }[];
  dividasItems: { name: string; value: number }[];
};

/** Soma (em centavos, positiva) das saídas de dia a dia da pessoa no mês. */
export function diaADiaReal(month: string, personId: number): number {
  const { from, to } = monthRange(month);
  return (
    get<{ s: number | null }>(
      `SELECT SUM(-t.amount) AS s FROM transactions t
       WHERE t.date BETWEEN ? AND ? AND t.amount < 0 AND t.person_id = ?
         AND t.bill_instance_id IS NULL AND ${BUCKET_SQL} = 'dia_a_dia'`,
      from, to, personId,
    )?.s ?? 0
  );
}

export function getSaldoPrevisto(month: string, meId: number): SaldoPrevisto {
  const st = getSettings();
  const salario = incomeOf(meId, month);
  const instances = listInstances(month);

  const casaItems = instances.filter((i) => i.scope === "house").map((i) => ({ name: i.name, value: i.amount }));
  const pessoaisItems = instances.filter((i) => i.scope === "personal").map((i) => ({ name: i.name, value: i.amount }));

  const casa = casaItems.reduce((s, i) => s + i.value, 0);
  const pessoais = pessoaisItems.reduce((s, i) => s + i.value, 0);
  // dívidas avulsas que vencem no mês (ou já venceram, no mês atual) também saem da sobra
  const dividasItems = debtsDueInMonth(month);
  const dividas = dividasItems.reduce((s, i) => s + i.value, 0);
  const real = diaADiaReal(month, meId);
  const diaADia = st.diaADiaBudget > 0 ? Math.max(real, st.diaADiaBudget) : real;
  const saldo = salario - casa - pessoais - dividas - diaADia;

  const segments: Segment[] = ([
    ...casaItems.map((i) => ({ key: `c-${i.name}`, label: i.name, value: i.value, kind: "casa" as const })),
    ...pessoaisItems.map((i) => ({ key: `p-${i.name}`, label: i.name, value: i.value, kind: "pessoal" as const })),
    ...dividasItems.map((i, n) => ({ key: `d-${n}-${i.name}`, label: `Dívida: ${i.name}`, value: i.value, kind: "divida" as const })),
    { key: "dia", label: "Dia a dia", value: diaADia, kind: "dia" },
    { key: "sobra", label: "Sobra", value: Math.max(saldo, 0), kind: "sobra" },
  ] as Segment[]).filter((s) => s.value > 0);

  return {
    salario, casa, pessoais, dividas, dividasItems, diaADia, diaADiaReal: real, diaADiaBudget: st.diaADiaBudget,
    saldo, pctLivre: salario > 0 ? saldo / salario : 0, segments, casaItems, pessoaisItems,
  };
}
