import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Card, CardHeader, Empty, Progress } from "../Card";
import { Money, Brl } from "../Money";
import { CardsBarChart } from "../charts/CardsBarChart";
import { formatDayMonth } from "@/lib/format";
import { cardClass } from "@/lib/cardTheme";
import { todayISO } from "@/lib/month";
import type { CartoesView } from "@/server/calc/cartoes";

export function Cartoes({ data, month }: { data: CartoesView; month: string }) {
  const today = todayISO();
  const usedPct = data.totalLimit > 0 ? (data.totalLimit - data.totalAvailable) / data.totalLimit : 0;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={CreditCard}
        tone="orange"
        title="Cartões"
        subtitle="Faturas e limite"
        right={<Link href={`/cartoes?m=${month}`} className="text-xs font-medium text-primary hover:underline">Detalhes</Link>}
      />
      {data.cards.length === 0 ? (
        <Empty>Nenhum cartão ainda. Conecte seu banco ou importe uma fatura em Conexões.</Empty>
      ) : (
        <>
          <p className="text-xs text-muted">A pagar no mês</p>
          <Money cents={data.totalOpen} size="lg" />
          {data.totalCarry > 0 ? (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">inclui <Brl cents={data.totalCarry} /> de fatura anterior não paga</p>
          ) : null}
          <ul className="mt-4 divide-y divide-line">
            {[...data.cards]
              .sort((a, b) => (a.nextDue ?? "9").localeCompare(b.nextDue ?? "9"))
              .map((c) => {
                const closed = c.nextClose !== null && c.nextClose <= today;
                return (
                  <li key={c.account.id} className="flex items-center gap-3 py-2.5">
                    <span className={`${cardClass(c.account.color, c.account.bank_name)} h-6 w-9 shrink-0 rounded-md`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.account.bank_name ?? c.account.name}</p>
                      <p className="truncate text-xs text-muted">
                        {c.nextDue ? (
                          <>
                            vence {formatDayMonth(c.nextDue)}{" "}
                            <span className={c.daysToDue !== null && c.daysToDue <= 3 ? "font-medium text-rose-600 dark:text-rose-400" : ""}>
                              ({c.daysToDue === 0 ? "hoje" : c.daysToDue === 1 ? "amanhã" : `em ${c.daysToDue} dias`})
                            </span>
                          </>
                        ) : "sem vencimento"}
                        {c.nextClose ? ` · ${closed ? "fechou" : "fecha"} ${formatDayMonth(c.nextClose)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums"><Brl cents={c.open} /></span>
                      {c.carryOver > 0 ? (
                        <span className="block text-[11px] text-rose-600 dark:text-rose-400" title="A fatura anterior foi paga só em parte (ex.: só o mínimo). O resto rola para esta com juros.">
                          inclui <Brl cents={c.carryOver} /> anterior
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
          </ul>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>Limite livre</span>
              <span className="font-medium text-ink"><Brl cents={data.totalAvailable} /></span>
            </div>
            <Progress value={usedPct} tone={usedPct > 0.8 ? "rose" : "primary"} />
          </div>
          <div className="mt-3 flex-1">
            <CardsBarChart data={data.projection.map((p) => ({ label: p.label, amount: p.amount, open: p.open }))} />
          </div>
        </>
      )}
    </Card>
  );
}
