import { pageCtx, type SearchParams } from "@/server/ctx";
import { getGastoAteAgora } from "@/server/calc/gastos";
import { getContasAPagar } from "@/server/calc/contas";
import { getCartoes } from "@/server/calc/cartoes";
import { getMoradia } from "@/server/calc/moradia";
import { getGeral } from "@/server/calc/geral";
import { categoryTotals, listTransactions, txPeriod, txTotals } from "@/server/repo/transactions";
import { Transacoes } from "@/components/cards/Transacoes";
import { listDebts } from "@/server/repo/debts";
import { Dividas } from "@/components/cards/Dividas";
import { formatDateBR } from "@/lib/format";
import { monthLabel, todayISO } from "@/lib/month";
import { GastoAteAgora } from "@/components/cards/GastoAteAgora";
import { ContasAPagar } from "@/components/cards/ContasAPagar";
import { GastosCategoria } from "@/components/cards/GastosCategoria";
import { Cartoes } from "@/components/cards/Cartoes";
import { Moradia } from "@/components/cards/Moradia";
import { Emprestimos } from "@/components/cards/Emprestimos";
import { listEmprestimos } from "@/server/calc/emprestimos";
import { Calendario } from "@/components/cards/Calendario";
import { getCalendar } from "@/server/repo/calendar";
import { CartoesGeral, MoradiaGeral, RecorrenciasGeral, ResumoGeral } from "@/components/cards/Geral";

export default async function VisaoGeral({ searchParams }: { searchParams: SearchParams }) {
  const { month, me, sp } = await pageCtx(searchParams);
  // ?p=geral: a home inteira mostra o histórico todo em vez do mês
  const geral = sp.p === "geral";
  const emprestimos = listEmprestimos();
  const debts = listDebts();
  const period = geral ? txPeriod() : null;
  const titulo = geral
    ? period?.from && period.to ? `Geral · de ${formatDateBR(period.from)} a ${formatDateBR(period.to)}` : "Geral"
    : monthLabel(month).charAt(0).toUpperCase() + monthLabel(month).slice(1);

  const header = (
    <div className="lg:col-span-3 -mb-2">
      <p className="text-sm text-muted">{titulo}</p>
    </div>
  );

  if (geral) {
    const g = getGeral(me.id);
    const allTime = { month, from: "0000-01-01", to: "9999-12-31" };
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {header}
        <ResumoGeral g={g} />
        <Transacoes txs={listTransactions({ ...allTime, limit: 40 })} totals={txTotals(allTime, true)} month={month} geral />
        <GastosCategoria data={categoryTotals(null)} month={month} geral period={period} />
        <CartoesGeral g={g} />
        <RecorrenciasGeral g={g} />
        <Dividas open={debts.open} total={debts.totalOpen} />
        <Emprestimos data={emprestimos} />
        <MoradiaGeral g={g} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {header}
      <GastoAteAgora data={getGastoAteAgora(month, me.id)} month={month} />
      <Calendario data={getCalendar(month)} today={todayISO()} />
      <Transacoes txs={listTransactions({ month, limit: 40 })} totals={txTotals({ month }, true)} month={month} />
      <GastosCategoria data={categoryTotals(month)} month={month} />
      <Cartoes data={getCartoes(month)} month={month} />
      <ContasAPagar data={getContasAPagar(month)} month={month} today={todayISO()} />
      <Dividas open={debts.open} total={debts.totalOpen} />
      <Emprestimos data={emprestimos} />
      <Moradia data={getMoradia(month, me.id)} month={month} />
    </div>
  );
}
