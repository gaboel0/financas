import { CreditCard } from "lucide-react";
import { pageCtx, type SearchParams } from "@/server/ctx";
import { getCartoes } from "@/server/calc/cartoes";
import { Card, CardHeader, Empty, PageHeader, Pill, Progress } from "@/components/Card";
import { CardFace } from "@/components/CardFace";
import { CardsBarChart } from "@/components/charts/CardsBarChart";
import { Money, Brl } from "@/components/Money";
import { formatDateBR, formatDayMonth, formatPct } from "@/lib/format";
import { monthLabel } from "@/lib/month";

export default async function Cartoes({ searchParams }: { searchParams: SearchParams }) {
  const { month } = await pageCtx(searchParams);
  const data = getCartoes(month);

  return (
    <>
      <PageHeader title="Cartões" subtitle={`Faturas de ${monthLabel(month)}, limite livre e projeção dos próximos meses.`} />
      {data.cards.length === 0 ? (
        <Empty>Nenhum cartão cadastrado. Conecte seu banco pela Pluggy ou importe uma fatura (OFX/CSV) em Conexões.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-3">
            <CardHeader icon={CreditCard} tone="orange" title="Projeção das faturas" subtitle="Parcelas restantes e assinaturas recorrentes de todos os cartões" />
            <div className="grid items-end gap-6 sm:grid-cols-[auto_1fr]">
              <div>
                <p className="text-xs text-muted">A pagar no mês</p>
                <Money cents={data.totalOpen} size="xl" />
                {data.totalCarry > 0 ? (
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">inclui <Brl cents={data.totalCarry} /> de fatura anterior não paga</p>
                ) : null}
                <p className="mt-2 text-sm text-muted">Limite livre <Brl cents={data.totalAvailable} /> de <Brl cents={data.totalLimit} /></p>
              </div>
              <CardsBarChart data={data.projection.map((p) => ({ label: p.label, amount: p.amount, open: p.open }))} height={170} />
            </div>
          </Card>

          {data.cards.map((c) => (
            <Card key={c.account.id} className="flex flex-col gap-5">
              <CardFace account={c.account} open={c.open} />
              {c.carryOver > 0 ? (
                <p className="-mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  Inclui <b><Brl cents={c.carryOver} /></b> da fatura anterior, que foi paga só em parte (os juros do rotativo podem aumentar esse valor).
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-soft px-3 py-2.5">
                  <p className="text-xs text-muted">Próximo fechamento</p>
                  <p className="font-semibold">{c.nextClose ? formatDateBR(c.nextClose) : "-"}</p>
                </div>
                <div className="rounded-xl bg-soft px-3 py-2.5">
                  <p className="text-xs text-muted">Vencimento</p>
                  <p className="font-semibold">
                    {c.nextDue ? formatDateBR(c.nextDue) : "-"}
                    {c.daysToDue !== null ? <span className="ml-1 text-xs font-normal text-muted">({c.daysToDue === 0 ? "hoje" : `em ${c.daysToDue}d`})</span> : null}
                  </p>
                </div>
              </div>
              {c.limit ? (
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-muted">
                    <span>Limite usado {formatPct(c.usedPct)}</span>
                    <span>livre <Brl cents={c.available ?? 0} /> / <Brl cents={c.limit} /></span>
                  </div>
                  <Progress value={c.usedPct} tone={c.usedPct > 0.8 ? "rose" : "primary"} />
                </div>
              ) : null}
              <CardsBarChart data={c.projection.map((p) => ({ label: p.label, amount: p.amount, open: p.open }))} height={130} />

              {c.parcelas.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted">Parcelamentos em andamento</p>
                  <ul className="space-y-2">
                    {c.parcelas.map((p) => (
                      <li key={p.description + p.total} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{p.description}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Pill tone="slate">{p.number}/{p.total}</Pill>
                          <span className="tabular-nums"><Brl cents={p.valor} /></span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-medium text-muted">Últimas compras</p>
                <ul className="space-y-1.5">
                  {c.recent.slice(0, 5).map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate"><span className="mr-2 text-xs text-muted tabular-nums">{formatDayMonth(t.date)}</span>{t.description}</span>
                      <span className="shrink-0 tabular-nums"><Brl cents={Math.abs(t.amount)} /></span>
                    </li>
                  ))}
                </ul>
              </div>

              {c.bills.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted">Faturas</p>
                  <ul className="space-y-1.5">
                    {c.bills.map((b) => (
                      <li key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted">vence {b.due_date ? formatDateBR(b.due_date) : "-"}</span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums"><Brl cents={b.total_amount} /></span>
                          <Pill tone={b.paid ? "green" : "amber"}>{b.paid ? "paga" : "aberta"}</Pill>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
