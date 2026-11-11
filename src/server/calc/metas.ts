import "server-only";
import { all } from "../db";

export type Goal = {
  id: number;
  name: string;
  icon: string | null;
  kind: "reserva" | "projeto";
  target_amount: number;
  monthly_contribution: number;
  interest_rate_monthly: number | null;
  start_date: string | null;
  notes: string | null;
};

export type GoalEntry = { id: number; goal_id: number; date: string; amount: number; balance_after: number };

export type GoalView = Goal & {
  saldo: number;
  progresso: number; // 0..1+
  jurosEstimado: number;
  mesesRestantes: number | null;
  entries: GoalEntry[];
};

export function listGoals(): GoalView[] {
  const goals = all<Goal>("SELECT * FROM goals ORDER BY kind, id");
  return goals.map((g) => {
    const entries = all<GoalEntry>("SELECT * FROM goal_entries WHERE goal_id = ? ORDER BY date, id", g.id);
    const saldo = entries.length ? entries[entries.length - 1].balance_after : 0;
    const faltam = Math.max(g.target_amount - saldo, 0);
    const rate = g.interest_rate_monthly ?? 0;
    let meses: number | null = null;
    if (faltam === 0) meses = 0;
    else if (g.monthly_contribution > 0 || (rate > 0 && saldo > 0)) {
      // simulação mês a mês (aporte + juros); cai no ceil simples quando não há juros
      if (rate <= 0) meses = Math.ceil(faltam / g.monthly_contribution);
      else {
        let b = saldo;
        let n = 0;
        while (b < g.target_amount && n < 600) {
          b = b * (1 + rate / 100) + g.monthly_contribution;
          n++;
        }
        meses = n >= 600 ? null : n;
      }
    }
    return {
      ...g,
      saldo,
      progresso: g.target_amount > 0 ? saldo / g.target_amount : 0,
      jurosEstimado: Math.round(saldo * (rate / 100)),
      mesesRestantes: meses,
      entries,
    };
  });
}
