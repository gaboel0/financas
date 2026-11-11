import Link from "next/link";
import { Receipt } from "lucide-react";
import { Card, CardHeader, Empty, Pill, Progress } from "../Card";
import { Money } from "../Money";
import { Tile } from "../Tile";
import { PaidCheckbox } from "../PaidCheckbox";
import { formatDayMonth } from "@/lib/format";
import type { ContasAPagar as Data } from "@/server/calc/contas";

function when(days: number): { text: string; tone: "rose" | "amber" | "blue" } {
  if (days < 0) return { text: `atrasada há ${-days} ${-days === 1 ? "dia" : "dias"}`, tone: "rose" };
  if (days === 0) return { text: "vence hoje", tone: "amber" };
  if (days === 1) return { text: "vence amanhã", tone: "amber" };
  return { text: `em ${days} dias`, tone: "blue" };
}

export function ContasAPagar({ data, month, today }: { data: Data; month: string; today: string }) {
  const nx = data.next;
  const w = nx ? when(nx.days) : null;
  const todayDay = Number(today.slice(8, 10));
  const isCurrent = today.slice(0, 7) === month;
  const list = data.instances;

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Receipt}
        tone="rose"
        title="Recorrências"
        subtitle={`${data.paidCount} de ${data.count} pagas`}
        right={<Link href={`/contas?m=${month}`} className="text-xs font-medium text-primary hover:underline">Ver todas</Link>}
      />
      <Money cents={data.total} size="lg" />
      <div className="mt-3"><Progress value={data.count ? data.paidCount / data.count : 0} tone="green" /></div>

      {nx && w ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-soft px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs text-muted">Próximo vencimento</p>
            <p className="truncate text-sm font-medium">{nx.name} · {formatDayMonth(nx.due_date)}</p>
          </div>
          <Pill tone={w.tone}>{w.text}</Pill>
        </div>
      ) : data.count > 0 ? (
        <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          Tudo pago neste mês.
        </div>
      ) : null}

      {data.chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.chips.map((c) => {
            const done = c.paid === c.total;
            const late = isCurrent && !done && c.day < todayDay;
            return (
              <div
                key={c.day}
                title={c.items.join(", ")}
                className={`rounded-xl border px-2.5 py-1.5 text-center ${
                  done ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : late ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10" : "border-line bg-card"
                }`}
              >
                <p className="text-xs font-semibold tabular-nums">dia {String(c.day).padStart(2, "0")}</p>
                <div className="mt-1 flex justify-center gap-1">
                  {Array.from({ length: c.total }).map((_, i) => (
                    <span key={i} className={`size-1.5 rounded-full ${i < c.paid ? "bg-emerald-500" : late ? "bg-rose-500" : "bg-neutral-300 dark:bg-neutral-600"}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ul className="scroll-thin mt-4 max-h-64 flex-1 space-y-1 overflow-y-auto pr-1">
        {list.length === 0 ? <Empty>Nenhuma conta cadastrada. Use &quot;Adicionar&quot; para criar a primeira.</Empty> : null}
        {list.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-xl px-1.5 py-2 hover:bg-soft">
            <PaidCheckbox instanceId={i.id} paid={Boolean(i.paid)} label={i.name} />
            <Tile icon={i.icon} tone={i.scope === "house" ? "blue" : "violet"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${i.paid ? "text-muted line-through" : ""}`}>{i.name}</p>
              <p className="text-xs text-muted">{formatDayMonth(i.due_date)}</p>
            </div>
            <Money cents={i.amount} size="xs" className="font-medium" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
