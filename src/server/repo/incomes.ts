import "server-only";
import { all, get } from "../db";

export type Income = {
  id: number;
  person_id: number;
  description: string;
  amount: number;
  recurring: number;
  month: string | null;
  active: number;
};

export function listIncomes(): Income[] {
  return all<Income>("SELECT * FROM incomes ORDER BY person_id, id");
}

export function incomeOverride(personId: number, month: string): number | null {
  return get<{ amount: number }>(
    "SELECT amount FROM income_overrides WHERE person_id = ? AND month = ?", personId, month,
  )?.amount ?? null;
}

/** Renda do mês: o override do mês (se existir) ou a soma das rendas ativas (recorrentes + do mês). */
export function incomeOf(personId: number, month: string): number {
  const o = incomeOverride(personId, month);
  if (o !== null) return o;
  return (
    get<{ s: number | null }>(
      "SELECT SUM(amount) AS s FROM incomes WHERE person_id = ? AND active = 1 AND (recurring = 1 OR month = ?)",
      personId, month,
    )?.s ?? 0
  );
}

/** Rendas efetivas do mês (para exibir quando não há override). */
export function incomesInMonth(personId: number, month: string): Income[] {
  return all<Income>(
    "SELECT * FROM incomes WHERE person_id = ? AND active = 1 AND (recurring = 1 OR month = ?) ORDER BY id",
    personId, month,
  );
}
