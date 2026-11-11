"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card, CardHeader, Pill } from "../Card";
import { Money } from "../Money";
import { Modal } from "../Modal";
import { formatDayMonth } from "@/lib/format";
import type { GastoAteAgora as Data, GastoTx } from "@/server/calc/gastos";

const COLORS = ["bg-blue-600", "bg-violet-500", "bg-amber-400", "bg-rose-500", "bg-emerald-500", "bg-sky-500"];
const OUTROS = "bg-neutral-400 dark:bg-neutral-500";
const TOP = 5;
const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const dow = (d: string) => DOW[new Date(d + "T12:00:00Z").getUTCDay()];

type Open = { title: string; txs: GastoTx[]; total: number; sub?: string };

function TxList({ txs, showDate = true }: { txs: GastoTx[]; showDate?: boolean }) {
  if (!txs.length) return <p className="text-sm text-muted">Nenhum gasto.</p>;
  return (
    <ul className="divide-y divide-line">
      {txs.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{t.description}</p>
            <p className="truncate text-[11px] text-muted">
              {showDate ? `${dow(t.date)} ${formatDayMonth(t.date)} · ` : ""}{t.category}{t.account ? ` · ${t.account}` : ""}
            </p>
          </div>
          <Money cents={t.amount} size="xs" className="shrink-0 font-medium" />
        </li>
      ))}
    </ul>
  );
}

export function GastoAteAgora({ data, month }: { data: Data; month: string }) {
  const [open, setOpen] = useState<Open | null>(null);
  const top = data.categorias.slice(0, TOP);
  const resto = data.categorias.slice(TOP);
  const restoTotal = resto.reduce((s, c) => s + c.total, 0);
  const restoNomes = new Set(resto.map((c) => c.nome));
  const grupos = [
    ...top.map((c, i) => ({ nome: c.nome, total: c.total, cls: COLORS[i], match: (t: GastoTx) => t.category === c.nome })),
    ...(restoTotal > 0 ? [{ nome: "Outros", total: restoTotal, cls: OUTROS, match: (t: GastoTx) => restoNomes.has(t.category) }] : []),
  ];
  const abrirGrupo = (g: (typeof grupos)[number]) => {
    const txs = data.txs.filter(g.match);
    setOpen({ title: g.nome, txs, total: g.total, sub: `${txs.length} ${txs.length === 1 ? "gasto" : "gastos"} · ${data.total ? Math.round((g.total / data.total) * 100) : 0}% do total` });
  };
  const abrirDia = (date: string, total: number) => {
    const txs = data.txs.filter((t) => t.date === date);
    setOpen({ title: `${dow(date)}, ${formatDayMonth(date)}`, txs, total, sub: `${txs.length} ${txs.length === 1 ? "gasto" : "gastos"} no dia` });
  };
  const maxDia = Math.max(...data.porDia.map((d) => d.total), 1);
  const maiores = [...data.txs].sort((a, b) => b.amount - a.amount).slice(0, 6);
  const periodo = data.emAndamento ? `de ${formatDayMonth(data.from)} até hoje (${formatDayMonth(data.to)})` : `de ${formatDayMonth(data.from)} a ${formatDayMonth(data.to)}`;

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        icon={Wallet}
        tone="blue"
        title="Gasto até agora"
        subtitle={<span>{periodo}</span>}
        right={data.dias ? <Pill tone="slate">média <Money cents={data.mediaDia} size="xs" />/dia</Pill> : null}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted">{data.emAndamento ? "Já saiu este mês" : "Saiu no mês"}</p>
          <Money cents={data.total} size="xl" />
        </div>
        <p className="max-w-56 text-right text-xs text-muted">
          Compras, contas pagas e Pix de pagamento. Transferências entre suas contas e pagamento de fatura não contam. Clique para ver o detalhe.
        </p>
      </div>

      <div data-bar="" className="mt-6 flex h-3.5 w-full origin-left overflow-hidden rounded-full bg-soft" role="group" aria-label="Gastos por categoria">
        {grupos.map((g) => (
          <button
            key={g.nome}
            type="button"
            title={`${g.nome}: R$ ${(g.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            aria-label={g.nome}
            onClick={() => abrirGrupo(g)}
            className={`${g.cls} h-full cursor-pointer border-r border-card transition-[filter] last:border-r-0 hover:brightness-125 active:scale-100`}
            style={{ width: `${(g.total / Math.max(data.total, 1)) * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {grupos.map((g) => (
          <button key={g.nome} type="button" onClick={() => abrirGrupo(g)} className="-m-2 min-w-0 rounded-xl p-2 text-left transition-colors hover:bg-soft">
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className={`size-2 shrink-0 rounded-full ${g.cls}`} /> <span className="truncate">{g.nome}</span>
            </span>
            <span className="mt-1.5 block"><Money cents={g.total} size="sm" /></span>
          </button>
        ))}
        {grupos.length === 0 ? <p className="col-span-full text-sm text-muted">Nenhum gasto ainda neste mês.</p> : null}
      </div>

      <div className="mt-7 grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted"><span className="size-2 rounded-full bg-blue-600" /> Quando</p>
          <div className="flex h-28 items-end gap-[3px]">
            {data.porDia.map((d) => (
              <button
                key={d.date}
                type="button"
                disabled={!d.total}
                onClick={() => abrirDia(d.date, d.total)}
                title={`${dow(d.date)} ${formatDayMonth(d.date)}: R$ ${(d.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                className="group flex h-full flex-1 items-end disabled:cursor-default"
              >
                <span
                  className={`w-full rounded-sm transition-[filter] group-enabled:group-hover:brightness-125 ${d.total ? (d.date === data.to && data.emAndamento ? "bg-amber-400" : "bg-blue-600") : "bg-soft"}`}
                  style={{ height: `${d.total ? Math.max((d.total / maxDia) * 100, 4) : 2}%` }}
                />
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>{formatDayMonth(data.from)}</span><span>{formatDayMonth(data.to)}</span>
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted"><span className="size-2 rounded-full bg-violet-500" /> Maiores gastos</p>
          {maiores.length === 0 ? <p className="text-sm text-muted">Nada por aqui.</p> : (
            <ul className="space-y-0.5">
              {maiores.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => abrirDia(t.date, data.porDia.find((d) => d.date === t.date)?.total ?? t.amount)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-soft"
                  >
                    <span className="w-11 shrink-0 text-[11px] tabular-nums text-muted">{formatDayMonth(t.date)}</span>
                    <span className="min-w-0 flex-1 truncate">{t.description}</span>
                    <Money cents={t.amount} size="xs" className="shrink-0 font-medium" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setOpen({ title: "Todos os gastos", txs: data.txs, total: data.total, sub: periodo })}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Ver todos ({data.txs.length})
          </button>
        </div>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""}>
        {open ? (
          <>
            <div className="mb-3 flex items-end justify-between gap-3">
              <Money cents={open.total} size="lg" />
              {open.sub ? <span className="text-xs text-muted">{open.sub}</span> : null}
            </div>
            <TxList txs={open.txs} />
            <Link href={`/fluxo?m=${month}`} className="mt-4 inline-block text-xs font-medium text-primary hover:underline">Abrir Fluxo de caixa →</Link>
          </>
        ) : null}
      </Modal>
    </Card>
  );
}
