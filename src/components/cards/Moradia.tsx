import Link from "next/link";
import { House } from "lucide-react";
import { Card, CardHeader, Empty, Progress } from "../Card";
import { Money } from "../Money";
import { Tile } from "../Tile";
import { formatPct } from "@/lib/format";
import type { Moradia as Data } from "@/server/calc/moradia";

function Gauge({ label, ratio, ref_, value }: { label: string; ratio: number; ref_: number; value: number }) {
  const tone = ratio <= ref_ ? "green" : ratio <= ref_ * 1.2 ? "amber" : "rose";
  const txt = ratio <= ref_ ? "text-emerald-600 dark:text-emerald-400" : ratio <= ref_ * 1.2 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className={`text-lg font-semibold tabular-nums ${txt}`}>{formatPct(ratio, 1)}</span>
      </div>
      <Progress value={ratio / 0.6} tone={tone} marker={ref_ / 0.6} />
      <p className="mt-1.5 text-[11px] text-muted">Meta de até {formatPct(ref_)} · <Money cents={value} size="xs" className="inline-flex" /></p>
    </div>
  );
}

export function Moradia({ data, month }: { data: Data; month: string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={House}
        tone="green"
        title="Moradia"
        subtitle="Peso da casa na renda"
        right={<Link href={`/casa?m=${month}`} className="text-xs font-medium text-primary hover:underline">Detalhes</Link>}
      />
      {data.items.length === 0 ? (
        <Empty>Marque contas como &quot;moradia&quot; para acompanhar o peso no orçamento.</Empty>
      ) : (
        <>
          <div className="space-y-5">
            <Gauge label="Sobre o salário" ratio={data.pctSalario} ref_={data.ref} value={data.total} />
          </div>
          <p className="mb-2 mt-6 text-xs font-medium text-muted">O que entra na conta</p>
          <ul className="grid grid-cols-2 gap-2">
            {data.items.map((i) => (
              <li key={i.id} className="flex items-center gap-2.5 rounded-xl bg-soft px-2.5 py-2">
                <Tile icon={i.icon} tone="green" size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{i.name}</p>
                  <Money cents={i.amount} size="xs" className="text-[11px] font-medium text-muted" />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
