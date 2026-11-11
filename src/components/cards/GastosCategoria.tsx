import Link from "next/link";
import { ChevronRight, PieChart } from "lucide-react";
import { Card, CardHeader, Empty } from "../Card";
import { Brl, Money } from "../Money";
import { CategoryDonut } from "../charts/CategoryDonut";
import { formatDateBR, formatPct } from "@/lib/format";
import { monthLabel, monthRange } from "@/lib/month";
import type { CategoryTotal } from "@/server/repo/transactions";

const COLORS = ["#2563eb", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#0ea5e9"];
const OTHERS = "#94a3b8";
const TOP = 6;
const MERCHANTS = 5;

type Row = { name: string; value: number; color: string; count: number; detail: { name: string; total: number; count: number }[]; href: string | null };

export function GastosCategoria({
  data, month, geral = false, period = null,
}: {
  data: CategoryTotal[];
  month: string;
  geral?: boolean;
  period?: { from: string | null; to: string | null } | null;
}) {
  const total = data.reduce((s, c) => s + c.total, 0);
  const { from, to } = monthRange(month);
  // Fluxo filtrado: a busca casa com o nome original da categoria (vem em inglês da Pluggy). No "geral", busca em tudo.
  const fluxo = (raw: string) =>
    `/fluxo?m=${month}&tipo=saida&q=${encodeURIComponent(raw)}${geral ? "" : `&de=${from}&ate=${to}`}`;
  const periodo = geral
    ? period?.from && period.to ? `de ${formatDateBR(period.from)} a ${formatDateBR(period.to)}` : "todo o período"
    : monthLabel(month);


  const top: Row[] = data.slice(0, TOP).map((c, i) => ({
    name: c.name,
    value: c.total,
    color: COLORS[i % COLORS.length],
    count: c.count,
    detail: c.merchants,
    href: c.raw.length === 1 ? fluxo(c.raw[0]) : null,
  }));
  const restCats = data.slice(TOP);
  const rows: Row[] = restCats.length
    ? [...top, {
        name: "Outras",
        value: restCats.reduce((s, c) => s + c.total, 0),
        color: OTHERS,
        count: restCats.reduce((s, c) => s + c.count, 0),
        detail: restCats.map((c) => ({ name: c.name, total: c.total, count: c.count })),
        href: null,
      }]
    : top;

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={PieChart}
        tone="violet"
        title="Gastos por categoria"
        subtitle={`${periodo.charAt(0).toUpperCase()}${periodo.slice(1)} · clique numa categoria para ver de onde veio`}
      />
      {rows.length === 0 ? (
        <Empty>{geral ? "Sem gastos registrados." : "Sem gastos neste mês."}</Empty>
      ) : (
        <>
          <div className="relative">
            <CategoryDonut data={rows.map((r) => ({ name: r.name, value: r.value, color: r.color }))} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] text-muted">Total</span>
              <Money cents={total} size="sm" />
            </div>
          </div>
          <ul className="mt-4 space-y-1">
            {rows.map((r) => (
              <li key={r.name}>
                <details className="group/cat rounded-xl open:bg-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-soft [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronRight className="size-3.5 shrink-0 text-muted transition group-open/cat:rotate-90" />
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Money cents={r.value} size="xs" className="font-medium" />
                      <span className="w-10 text-right text-xs tabular-nums text-muted">{formatPct(r.value / total)}</span>
                    </span>
                  </summary>
                  <div className="px-2 pb-2.5 pl-9">
                    <ul className="space-y-1">
                      {r.detail.slice(0, MERCHANTS).map((m) => (
                        <li key={m.name} className="flex items-center justify-between gap-3 text-xs">
                          <span className="min-w-0 truncate text-muted">
                            {m.name}
                            {m.count > 1 ? <span className="ml-1 opacity-70">· {m.count}x</span> : null}
                          </span>
                          <span className="shrink-0 tabular-nums"><Brl cents={m.total} /></span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                      <span>
                        {r.detail.length > MERCHANTS ? `e mais ${r.detail.length - MERCHANTS} · ` : ""}
                        {r.count} {r.count === 1 ? "compra" : "compras"}
                      </span>
                      {r.href ? <Link href={r.href} className="font-medium text-primary hover:underline">Ver transações</Link> : null}
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
