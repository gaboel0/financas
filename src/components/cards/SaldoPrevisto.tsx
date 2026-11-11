"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card, CardHeader, Pill } from "../Card";
import { Money } from "../Money";
import { Modal } from "../Modal";
import { formatDayMonth, formatPct } from "@/lib/format";
import { monthLabel } from "@/lib/month";
import { catLabel } from "@/lib/categories";
import type { BillItem, SaldoPrevisto as Saldo, Segment } from "@/server/calc/saldo";

const CASA = ["bg-blue-700", "bg-blue-600", "bg-blue-500", "bg-sky-500", "bg-blue-400", "bg-sky-400"];
const PESSOAL = ["bg-violet-600", "bg-violet-500", "bg-fuchsia-500", "bg-violet-400"];

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type Kind = Segment["kind"] | "salario";

function segClass(kind: string, idx: number): string {
  if (kind === "casa") return CASA[idx % CASA.length];
  if (kind === "pessoal") return PESSOAL[idx % PESSOAL.length];
  if (kind === "divida") return "bg-rose-500";
  if (kind === "dia") return "bg-amber-400";
  return "bg-emerald-500";
}

const TITLES: Record<Kind, string> = {
  salario: "Salário",
  casa: "Contas da casa",
  pessoal: "Contas pessoais",
  divida: "Dívidas do mês",
  dia: "Gastos do dia a dia",
  sobra: "Como a sobra é calculada",
};

function Bills({ items, total, highlight }: { items: BillItem[]; total: number; highlight?: string }) {
  if (!items.length) return <p className="text-sm text-muted">Nada neste mês.</p>;
  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={i.name} className={`flex items-center gap-3 py-2.5 ${highlight === i.name ? "-mx-2 rounded-lg bg-soft px-2" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.name}</p>
              <p className="text-[11px] text-muted">vence {formatDayMonth(i.due_date)}</p>
            </div>
            <Pill tone={i.paid ? "green" : "amber"}>{i.paid ? "pago" : "a pagar"}</Pill>
            <Money cents={i.value} size="xs" className="w-24 text-right font-medium" />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm font-semibold">
        <span>Total</span><Money cents={total} size="xs" />
      </div>
    </>
  );
}

function Detail({ kind, data, month, highlight }: { kind: Kind; data: Saldo; month: string; highlight?: string }) {
  const link = (href: string, label: string) => (
    <Link href={href} className="mt-4 inline-block text-xs font-medium text-primary hover:underline">{label} →</Link>
  );

  if (kind === "casa") return <><Bills items={data.casaItems} total={data.casa} highlight={highlight} />{link(`/contas?m=${month}`, "Abrir Contas fixas")}</>;
  if (kind === "pessoal") return <><Bills items={data.pessoaisItems} total={data.pessoais} highlight={highlight} />{link(`/contas?m=${month}`, "Abrir Contas fixas")}</>;

  if (kind === "divida") {
    return (
      <>
        <ul className="divide-y divide-line">
          {data.dividasItems.map((d, n) => (
            <li key={n} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="truncate font-medium">{d.name}</span><Money cents={d.value} size="xs" />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted">Dívidas avulsas que vencem neste mês (ou já venceram e seguem em aberto).</p>
        {link("/dividas", "Abrir Dívidas")}
      </>
    );
  }

  if (kind === "dia") {
    const porCat = new Map<string, number>();
    for (const t of data.diaItems) {
      const c = catLabel(t.category);
      porCat.set(c, (porCat.get(c) ?? 0) + t.amount);
    }
    const cats = [...porCat].sort((a, b) => b[1] - a[1]);
    const max = cats[0]?.[1] ?? 1;
    return (
      <>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-soft px-3 py-2.5">
            <p className="text-[11px] text-muted">Gasto real</p>
            <Money cents={data.diaADiaReal} size="sm" />
          </div>
          <div className="rounded-xl bg-soft px-3 py-2.5">
            <p className="text-[11px] text-muted">{data.diaADiaBudget > 0 ? "Orçamento" : "Lançamentos"}</p>
            {data.diaADiaBudget > 0 ? <Money cents={data.diaADiaBudget} size="sm" /> : <p className="text-base font-semibold">{data.diaItems.length}</p>}
          </div>
        </div>
        {data.diaADiaBudget > 0 ? (
          <p className="mb-4 text-[11px] text-muted">Na conta da sobra entra o maior entre o orçamento e o gasto real.</p>
        ) : null}

        <p className="mb-2 text-xs font-medium text-muted">Por categoria</p>
        <ul className="mb-5 space-y-2">
          {cats.map(([c, v]) => (
            <li key={c}>
              <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{c}</span><Money cents={v} size="xs" className="font-medium" /></div>
              <div className="h-1.5 rounded-full bg-soft"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(v / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>

        <p className="mb-1 text-xs font-medium text-muted">Lançamentos (maiores primeiro)</p>
        <ul className="divide-y divide-line">
          {data.diaItems.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.description}</p>
                <p className="truncate text-[11px] text-muted">{formatDayMonth(t.date)} · {catLabel(t.category)}{t.account ? ` · ${t.account}` : ""}</p>
              </div>
              <Money cents={t.amount} size="xs" className="shrink-0 font-medium" />
            </li>
          ))}
        </ul>
        {link(`/fluxo?m=${month}`, "Abrir Fluxo de caixa")}
      </>
    );
  }

  if (kind === "salario") {
    return (
      <>
        <Money cents={data.salario} size="lg" />
        <p className="mt-2 text-sm text-muted">Renda prevista do mês, usada como ponto de partida da sobra.</p>
        {link(`/renda?m=${month}`, "Abrir Renda")}
      </>
    );
  }

  const linhas: [string, number, string][] = [
    ["Salário", data.salario, ""],
    ["Contas da casa", -data.casa, ""],
    ["Contas pessoais", -data.pessoais, ""],
    ["Dívidas do mês", -data.dividas, ""],
    [data.diaADiaBudget > 0 ? "Dia a dia (orçamento ou real, o maior)" : "Dia a dia (gasto real)", -data.diaADia, ""],
  ];
  return (
    <>
      <ul className="divide-y divide-line">
        {linhas.map(([l, v]) => (
          <li key={l} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span>{l}</span>
            <span className={`tabular-nums ${v < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>{v < 0 ? "−" : ""}<Money cents={Math.abs(v)} size="xs" /></span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm font-semibold">
        <span>Sobra</span>
        <Money cents={data.saldo} size="sm" className={data.saldo < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"} />
      </div>
    </>
  );
}

export function SaldoPrevisto({ data, month }: { data: Saldo; month: string }) {
  const [open, setOpen] = useState<{ kind: Kind; highlight?: string } | null>(null);
  const total = data.casa + data.pessoais + data.dividas + data.diaADia;
  const totalBar = Math.max(total, 1);
  let ci = 0;
  let pi = 0;
  const segs = data.segments
    .filter((s) => s.kind !== "sobra")
    .map((s) => ({ ...s, cls: segClass(s.kind, s.kind === "casa" ? ci++ : s.kind === "pessoal" ? pi++ : 0) }));
  const pctSalario = data.salario > 0 ? total / data.salario : null;

  const rows: { kind: Kind; label: string; value: number; dot: string; hint?: string }[] = [
    { kind: "casa", label: "Casa", value: data.casa, dot: "bg-blue-600" },
    { kind: "pessoal", label: "Contas pessoais", value: data.pessoais, dot: "bg-violet-500" },
    ...(data.dividas > 0 ? [{ kind: "divida" as const, label: "Dívidas", value: data.dividas, dot: "bg-rose-500" }] : []),
    {
      kind: "dia",
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
        title="Gastos do mês"
        subtitle={<span>{cap(monthLabel(month))}</span>}
        right={pctSalario !== null ? <Pill tone={pctSalario > 1 ? "rose" : "slate"}>{formatPct(pctSalario)} da renda</Pill> : null}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted">Total gasto no mês</p>
          <Money cents={total} size="xl" />
        </div>
        <p className="max-w-56 text-right text-xs text-muted">
          Contas da casa, contas pessoais, dívidas do mês e gastos do dia a dia. Clique nas barras para ver o detalhe.
        </p>
      </div>

      <div data-bar="" className="mt-6 flex h-3.5 w-full origin-left overflow-hidden rounded-full bg-soft" role="group" aria-label="Composição dos gastos do mês">
        {segs.map((s) => (
          <button
            key={s.key}
            type="button"
            title={`${s.label}: R$ ${(s.value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            aria-label={s.label}
            onClick={() => setOpen({ kind: s.kind, highlight: s.label })}
            className={`${s.cls} h-full cursor-pointer border-r border-card transition-[filter] last:border-r-0 hover:brightness-125 active:scale-100`}
            style={{ width: `${(s.value / totalBar) * 100}%` }}
          />
        ))}
      </div>

      <div className={`mt-6 grid grid-cols-2 gap-x-6 gap-y-5 ${data.dividas > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        {rows.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setOpen({ kind: r.kind })}
            className="-m-2 rounded-xl p-2 text-left transition-colors hover:bg-soft"
          >
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className={`size-2 rounded-full ${r.dot}`} /> {r.label}
            </span>
            <span className="mt-1.5 block">
              <Money cents={r.value} size="sm" className={r.kind === "sobra" ? "text-emerald-600 dark:text-emerald-400" : ""} />
            </span>
            {r.hint ? <span className="mt-0.5 block text-[11px] text-muted">{r.hint}</span> : null}
          </button>
        ))}
      </div>
      <div className="mt-7 grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
        {[
          { kind: "casa" as const, title: "Casa", dot: "bg-blue-600", items: data.casaItems },
          { kind: "pessoal" as const, title: "Contas pessoais", dot: "bg-violet-500", items: data.pessoaisItems },
        ].map((g) => (
          <div key={g.title}>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              <span className={`size-2 rounded-full ${g.dot}`} /> {g.title}
            </p>
            {g.items.length === 0 ? (
              <p className="text-sm text-muted">Nada por aqui neste mês.</p>
            ) : (
              <ul className="space-y-0.5">
                {g.items.map((i) => (
                  <li key={i.name}>
                    <button
                      type="button"
                      onClick={() => setOpen({ kind: g.kind, highlight: i.name })}
                      className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-soft"
                    >
                      <span className="truncate">{i.name}</span>
                      <Money cents={i.value} size="xs" className="font-medium" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? TITLES[open.kind] : ""}>
        {open ? <Detail kind={open.kind} data={data} month={month} highlight={open.highlight} /> : null}
      </Modal>
    </Card>
  );
}
