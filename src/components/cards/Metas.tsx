import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardHeader, Empty, Pill, Progress } from "../Card";
import { Money } from "../Money";
import { Tile } from "../Tile";
import { GoalChart } from "../charts/GoalChart";
import { formatPct } from "@/lib/format";
import { monthShort } from "@/lib/month";
import type { GoalView } from "@/server/calc/metas";

export function goalPoints(g: GoalView) {
  return g.entries.map((e) => ({ label: monthShort(e.date.slice(0, 7)), saldo: e.balance_after }));
}

export function Metas({ goals }: { goals: GoalView[] }) {
  return (
    <Card>
      <CardHeader
        icon={Target}
        tone="amber"
        title="Metas e projetos"
        subtitle="Reserva e obras em andamento"
        right={<Link href="/reserva" className="text-xs font-medium text-primary hover:underline">Gerenciar</Link>}
      />
      {goals.length === 0 ? (
        <Empty>Crie sua primeira meta em Reserva.</Empty>
      ) : (
        <div className="grid gap-8">
          {goals.map((g) => (
            <div key={g.id} className="grid gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Tile icon={g.icon} tone={g.kind === "reserva" ? "green" : "amber"} />
                  <div>
                    <p className="text-sm font-semibold">{g.name}</p>
                    <p className="text-xs text-muted">{g.kind === "reserva" ? "Reserva" : "Projeto"} · meta <Money cents={g.target_amount} size="xs" className="inline-flex" /></p>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <Money cents={g.saldo} size="lg" />
                  <span className="text-sm font-semibold text-primary">{formatPct(g.progresso)}</span>
                </div>
                <div className="mt-2"><Progress value={g.progresso} tone={g.kind === "reserva" ? "green" : "primary"} /></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {g.mesesRestantes !== null ? (
                    <Pill tone="blue">{g.mesesRestantes === 0 ? "Meta atingida" : `${g.mesesRestantes} ${g.mesesRestantes === 1 ? "mês" : "meses"} para a meta`}</Pill>
                  ) : null}
                  {g.monthly_contribution > 0 ? <Pill tone="slate">aporte <Money cents={g.monthly_contribution} size="xs" className="ml-1 inline-flex" /></Pill> : null}
                  {g.interest_rate_monthly ? (
                    <Pill tone="green">
                      juros ~<Money cents={g.jurosEstimado} size="xs" className="mx-1 inline-flex" />/mês ({g.interest_rate_monthly.toLocaleString("pt-BR")}% a.m.)
                    </Pill>
                  ) : null}
                </div>
              </div>
              <GoalChart id={`dash-${g.id}`} data={goalPoints(g)} target={g.target_amount} color={g.kind === "reserva" ? "#10b981" : "#2563eb"} height={150} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
