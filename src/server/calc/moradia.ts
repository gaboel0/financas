import "server-only";
import { incomeOf } from "../repo/incomes";
import { getSettings } from "../repo/settings";
import { listInstances } from "./contas";

export type Moradia = {
  ref: number;
  total: number;
  salario: number;
  pctSalario: number;
  items: { id: number; name: string; icon: string | null; amount: number }[];
};

export function getMoradia(month: string, meId: number): Moradia {
  const items = listInstances(month)
    .filter((i) => i.is_housing)
    .map((i) => ({ id: i.id, name: i.name, icon: i.icon, amount: i.amount }));
  const total = items.reduce((s, i) => s + i.amount, 0);
  const salario = incomeOf(meId, month);
  return { ref: getSettings().moradiaRef, total, salario, pctSalario: salario > 0 ? total / salario : 0, items };
}
