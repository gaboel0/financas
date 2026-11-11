import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, Empty } from "../Card";
import { Brl } from "../Money";
import { catLabel } from "@/lib/categories";
import { cleanMerchant } from "@/lib/merchant";
import { formatDayMonth } from "@/lib/format";
import type { TxRow } from "@/server/repo/transactions";

/** Extrato: tudo o que entrou e saiu (compras, Pix, transferências, faturas), mais recente primeiro. */
export function Transacoes({
  txs, totals, month, geral = false,
}: {
  txs: TxRow[];
  totals: { count: number; entradas: number; saidas: number };
  month: string;
  geral?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={ArrowLeftRight}
        tone="sky"
        title="Transações"
        subtitle={geral ? "Mais recentes" : `${totals.count} no mês`}
        right={<Link href={`/fluxo?m=${month}`} className="text-xs font-medium text-primary hover:underline">Ver todas</Link>}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-soft px-3 py-2">
          <p className="text-[11px] text-muted">Entrou</p>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"><Brl cents={totals.entradas} /></p>
        </div>
        <div className="rounded-xl bg-soft px-3 py-2">
          <p className="text-[11px] text-muted">Saiu</p>
          <p className="text-sm font-semibold"><Brl cents={totals.saidas} /></p>
        </div>
      </div>
      {txs.length === 0 ? (
        <div className="mt-4"><Empty>{geral ? "Nenhuma transação ainda." : "Nenhuma transação neste mês."}</Empty></div>
      ) : (
        <ul className="scroll-thin -mr-2 mt-3 max-h-[19rem] flex-1 divide-y divide-line overflow-y-auto pr-2">
          {txs.map((t) => {
            const entrada = t.amount > 0;
            const Icon = entrada ? ArrowDownLeft : ArrowUpRight;
            return (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    entrada ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={t.description}>{cleanMerchant(t.description)}</p>
                  <p className="truncate text-[11px] text-muted">
                    {formatDayMonth(t.date)} · {t.bank_name ?? t.account_name}
                    {` · ${catLabel(t.category)}`}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${entrada ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                  {entrada ? "+" : "−"}<Brl cents={Math.abs(t.amount)} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
