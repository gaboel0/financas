import Link from "next/link";
import { CreditCard, House, Receipt, Wallet } from "lucide-react";
import { Card, CardHeader, Empty, Pill, Progress } from "../Card";
import { Brl, Money } from "../Money";
import { FlowChart } from "../charts/FlowChart";
import { CardsBarChart } from "../charts/CardsBarChart";
import { cardClass } from "@/lib/cardTheme";
import { formatPct } from "@/lib/format";
import { monthShort } from "@/lib/month";
import type { Geral } from "@/server/calc/geral";

const meses = (n: number) => `${n} ${n === 1 ? "mês" : "meses"}`;

/** No lugar do Saldo previsto: entradas x saídas do período todo. */
export function ResumoGeral({ g }: { g: Geral }) {
  const positive = g.resultado >= 0;
  return (
    <Card className="lg:col-span-2">
      <CardHeader
        icon={Wallet}
        tone="blue"
        title="Resumo do período"
        subtitle={`Últimos ${meses(g.months)} · sem transferências entre suas contas`}
        right={<Pill tone={positive ? "green" : "rose"}>{positive ? "sobrou dinheiro" : "gastou mais do que entrou"}</Pill>}
      />
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Entradas</p>
          <Money cents={g.entradas} size="lg" className="text-emerald-600 dark:text-emerald-400" />
          <p className="mt-1 text-xs text-muted">média <Brl cents={g.mediaEntradas} />/mês</p>
        </div>
        <div>
          <p className="text-xs text-muted">Saídas</p>
          <Money cents={g.saidas} size="lg" />
          <p className="mt-1 text-xs text-muted">média <Brl cents={g.mediaSaidas} />/mês</p>
        </div>
        <div>
          <p className="text-xs text-muted">Resultado</p>
          <Money cents={g.resultado} size="lg" className={positive ? "" : "text-rose-600 dark:text-rose-400"} />
          <p className="mt-1 text-xs text-muted">média <Brl cents={Math.round(g.resultado / g.months)} />/mês</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Entradas incluem <Brl cents={g.deFora} /> que chegaram por Pix de contas suas fora do app (como a do salário) e <Brl cents={g.outrasEntradas} /> de outras entradas do extrato.
      </p>
      <div className="mt-6">
        <FlowChart data={g.flow.map((f) => ({ label: monthShort(f.month), entradas: f.entradas, saidas: f.saidas }))} />
      </div>
    </Card>
  );
}

/** No lugar das Recorrências do mês: quanto as contas fixas custam por mês e por ano. */
export function RecorrenciasGeral({ g }: { g: Geral }) {
  const r = g.recorrencias;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Receipt}
        tone="rose"
        title="Recorrências"
        subtitle={`${r.items.length} contas fixas`}
        right={<Link href="/contas" className="text-xs font-medium text-primary hover:underline">Ver todas</Link>}
      />
      {r.items.length === 0 ? <Empty>Nenhuma conta fixa cadastrada.</Empty> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">Por mês</p>
              <Money cents={r.mensal} size="md" />
            </div>
            <div>
              <p className="text-xs text-muted">Por ano</p>
              <Money cents={r.anual} size="md" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">Já pago no período: <Brl cents={r.pagoNoPeriodo} /></p>
          <ul className="mt-4 divide-y divide-line text-sm">
            {r.items.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{b.name}<span className="ml-1.5 text-xs text-muted">dia {b.dueDay}</span></span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium tabular-nums"><Brl cents={b.amount} /></span>
                  <span className="block text-[11px] text-muted"><Brl cents={b.amount * 12} />/ano</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/** No lugar das faturas do mês: quanto passou em cada cartão no período. */
export function CartoesGeral({ g }: { g: Geral }) {
  const c = g.cartoes;
  const used = c.limite > 0 ? (c.limite - c.disponivel) / c.limite : 0;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={CreditCard}
        tone="orange"
        title="Cartões"
        subtitle={`Gasto no crédito em ${meses(g.months)}`}
        right={<Link href="/cartoes" className="text-xs font-medium text-primary hover:underline">Detalhes</Link>}
      />
      {c.cards.length === 0 ? <Empty>Nenhum cartão ainda.</Empty> : (
        <>
          <Money cents={c.total} size="lg" />
          <p className="mt-1 text-xs text-muted">média <Brl cents={c.media} />/mês</p>
          <ul className="mt-4 divide-y divide-line">
            {c.cards.map((card) => (
              <li key={card.id} className="flex items-center gap-3 py-2.5">
                <span className={`${cardClass(null, card.bank)} h-6 w-9 shrink-0 rounded-md`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{card.bank ?? card.name}</p>
                  <p className="truncate text-xs text-muted">média <Brl cents={card.media} />/mês</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums"><Brl cents={card.total} /></span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>Limite livre hoje</span>
              <span className="font-medium text-ink"><Brl cents={c.disponivel} /></span>
            </div>
            <Progress value={used} tone={used > 0.8 ? "rose" : "primary"} />
          </div>
          <div className="mt-3 flex-1">
            <CardsBarChart data={c.porMes.map((p, i) => ({ label: monthShort(p.month).slice(0, 1), amount: p.amount, open: i === c.porMes.length - 1 }))} labels={false} height={110} />
          </div>
        </>
      )}
    </Card>
  );
}

/** No lugar da Moradia do mês: o que já foi pago em moradia e o peso médio. */
export function MoradiaGeral({ g }: { g: Geral }) {
  const m = g.moradia;
  const tone = m.pctMedio <= m.ref ? "green" : m.pctMedio <= m.ref * 1.2 ? "amber" : "rose";
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={House}
        tone="green"
        title="Moradia"
        subtitle={`Pago em ${meses(g.months)}`}
        right={<Link href="/apartamento" className="text-xs font-medium text-primary hover:underline">Apartamento</Link>}
      />
      {m.items.length === 0 ? <Empty>Nenhum pagamento de moradia marcado como pago no período.</Empty> : (
        <>
          <Money cents={m.total} size="lg" />
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs text-muted">Média sobre o salário</span>
              <span className="text-lg font-semibold tabular-nums">{formatPct(m.pctMedio, 1)}</span>
            </div>
            <Progress value={m.pctMedio / 0.6} tone={tone} marker={m.ref / 0.6} />
            <p className="mt-1.5 text-[11px] text-muted">Meta de até {formatPct(m.ref)} · média <Brl cents={m.mediaMensal} />/mês</p>
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {m.items.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{i.name}</span>
                <span className="font-medium tabular-nums"><Brl cents={i.total} /></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
