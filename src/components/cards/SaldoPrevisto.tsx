import { Wallet } from "lucide-react";
import { Card, CardHeader, Pill } from "../Card";
import { Money } from "../Money";
import { formatPct } from "@/lib/format";
import { monthLabel } from "@/lib/month";
import type { SaldoPrevisto as Saldo } from "@/server/calc/saldo";

const CASA = ["bg-blue-700", "bg-blue-600", "bg-blue-500", "bg-sky-500", "bg-blue-400", "bg-sky-400"];
const PESSOAL = ["bg-violet-600", "bg-violet-500", "bg-fuchsia-500", "bg-violet-400"];

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function segClass(kind: string, idx: number): string {
  if (kind === "casa") return CASA[idx % CASA.length];
  if (kind === "pessoal") return PESSOAL[idx % PESSOAL.length];
  if (kind === "divida") return "bg-rose-500";
  if (kind === "dia") return "bg-amber-400";
  return "bg-emerald-500";
}

export function SaldoPrevisto({ data, month }: { data: Saldo; month: string }) {
  const positive = data.saldo >= 0;
  const totalBar = Math.max(data.salario, data.salario - data.saldo, 1);
  let ci = 0;
  let pi = 0;
  const segs = data.segments.map((s) => ({ ...s, cls: segClass(s.kind, s.kind === "casa" ? ci++ : s.kind === "pessoal" ? pi++ : 0) }));

  const rows: { label: string; value: number; dot: string; hint?: string }[] = [
    { label: "Salário", value: data.salario, dot: "bg-neutral-800 dark:bg-neutral-200" },
    { label: "Casa", value: data.casa, dot: "bg-blue-600" },
    { label: "Contas pessoais", value: data.pessoais, dot: "bg-violet-500" },
    ...(data.dividas > 0 ? [{ label: "Dívidas", value: data.dividas, dot: "bg-rose-500" }] : []),
    {
      label: "Dia a dia",
      value: data.diaADia,
      dot: "bg-amber-400",
      hint: data.diaADiaBudget > 0 ? (data.diaADiaReal > data.diaADiaBudget ? "acima do orçamento" : `orçamento; gasto ${(data.diaADiaReal / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`) : "gasto real",
    },
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        icon={Wallet}
        tone="blue"
        title="Saldo previsto"
        subtitle={<span>{cap(monthLabel(month))}</span>}
        right={
          <Pill tone={positive ? "green" : "rose"}>
            {positive ? `${formatPct(data.pctLivre)} do salário livre` : "Mês no vermelho"}
          </Pill>
        }
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted">Sobra estimada depois de tudo pago</p>
          <Money cents={data.saldo} size="xl" className={positive ? "" : "text-rose-600 dark:text-rose-400"} />
        </div>
        <p className="max-w-56 text-right text-xs text-muted">
          Salário menos contas da casa, contas pessoais, dívidas do mês e gastos do dia a dia.
        </p>
      </div>

      <div data-bar="" className="mt-6 flex h-3.5 w-full origin-left overflow-hidden rounded-full bg-soft" role="img" aria-label="Composição do salário">
        {segs.map((s) => (
          <div key={s.key} title={`${s.label}`} className={`${s.cls} h-full border-r border-card last:border-r-0`} style={{ width: `${(s.value / totalBar) * 100}%` }} />
        ))}
      </div>

      <dl className={`mt-6 grid grid-cols-2 gap-x-6 gap-y-5 ${data.dividas > 0 ? "sm:grid-cols-6" : "sm:grid-cols-5"}`}>
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="flex items-center gap-2 text-xs text-muted">
              <span className={`size-2 rounded-full ${r.dot}`} /> {r.label}
            </dt>
            <dd className="mt-1.5"><Money cents={r.value} size="sm" /></dd>
            {r.hint ? <p className="mt-0.5 text-[11px] text-muted">{r.hint}</p> : null}
          </div>
        ))}
        <div>
          <dt className="flex items-center gap-2 text-xs text-muted">
            <span className="size-2 rounded-full bg-emerald-500" /> Sobra
          </dt>
          <dd className="mt-1.5">
            <Money cents={Math.max(data.saldo, 0)} size="sm" className="text-emerald-600 dark:text-emerald-400" />
          </dd>
        </div>
      </dl>
      <div className="mt-7 grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
        {[
          { title: "Casa", dot: "bg-blue-600", items: data.casaItems },
          { title: "Contas pessoais", dot: "bg-violet-500", items: data.pessoaisItems },
        ].map((g) => (
          <div key={g.title}>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              <span className={`size-2 rounded-full ${g.dot}`} /> {g.title}
            </p>
            {g.items.length === 0 ? (
              <p className="text-sm text-muted">Nada por aqui neste mês.</p>
            ) : (
              <ul className="space-y-1.5">
                {g.items.map((i) => (
                  <li key={i.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{i.name}</span>
                    <Money cents={i.value} size="xs" className="font-medium" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
