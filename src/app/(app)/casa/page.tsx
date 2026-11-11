import { Home, SlidersHorizontal } from "lucide-react";
import { pageCtx, type SearchParams } from "@/server/ctx";
import { listInstances } from "@/server/calc/contas";
import { getMoradia } from "@/server/calc/moradia";
import { getSaldoPrevisto } from "@/server/calc/saldo";
import { saveBudget } from "@/server/actions/settings";
import { Card, CardHeader, Empty, PageHeader } from "@/components/Card";
import { Moradia } from "@/components/cards/Moradia";
import { Money } from "@/components/Money";
import { InlineForm } from "@/components/InlineForm";
import { centsToInput, formatDateBR } from "@/lib/format";
import { inputCls, labelCls } from "@/lib/ui";

export default async function Casa({ searchParams }: { searchParams: SearchParams }) {
  const { month, me, settings } = await pageCtx(searchParams);
  const items = listInstances(month).filter((i) => i.scope === "house");
  const moradia = getMoradia(month, me.id);
  const saldo = getSaldoPrevisto(month, me.id);

  return (
    <>
      <PageHeader title="Casa" subtitle="Contas da casa no mês, peso da moradia no salário e orçamento." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={Home} tone="blue" title="Contas da casa no mês" subtitle="Valor de cada conta" />
          {items.length === 0 ? (
            <Empty>Nenhuma conta da casa neste mês. Cadastre em Contas fixas.</Empty>
          ) : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-medium">Conta</th>
                    <th className="py-2 pr-3 font-medium">Vencimento</th>
                    <th className="py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{i.name}</td>
                      <td className="py-2.5 pr-3 text-muted">{formatDateBR(i.due_date)}</td>
                      <td className="py-2.5 text-right"><Money cents={i.amount} size="xs" className="font-medium" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Moradia data={moradia} month={month} />

        <Card>
          <CardHeader icon={SlidersHorizontal} tone="amber" title="Orçamento e referência" subtitle="Dia a dia e peso da moradia" />
          <InlineForm action={saveBudget}>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Orçamento do dia a dia (R$ por mês)</label>
                <input name="budget" inputMode="decimal" defaultValue={settings.diaADiaBudget ? centsToInput(settings.diaADiaBudget) : ""} placeholder="sem orçamento" className={inputCls} />
                <p className="mt-1 text-xs text-muted">O saldo previsto usa o maior entre o gasto real ({`R$ ${(saldo.diaADiaReal / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}) e o orçamento.</p>
              </div>
              <div>
                <label className={labelCls}>Referência de moradia (% da renda)</label>
                <input name="moradia_ref" inputMode="decimal" defaultValue={Math.round(settings.moradiaRef * 1000) / 10} className={inputCls} />
              </div>
            </div>
          </InlineForm>
        </Card>
      </div>
    </>
  );
}
