import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { pageCtx, type SearchParams } from "@/server/ctx";
import { bucketTotals, listTransactions, monthlyFlow, txTotals, type TxFilter } from "@/server/repo/transactions";
import { listAccounts } from "@/server/repo/accounts";
import { categoryNames } from "@/server/repo/rules";
import { RuleButton } from "@/components/RuleButton";
import { catLabel } from "@/lib/categories";
import { btnGhost, btnPrimary, inputCls } from "@/lib/ui";
import Link from "next/link";
import { deleteTransaction } from "@/server/actions/transacoes";
import { Card, CardHeader, Empty, PageHeader } from "@/components/Card";
import { Brl, Money } from "@/components/Money";
import { Tile } from "@/components/Tile";
import { FlowChart } from "@/components/charts/FlowChart";
import { BucketSelect } from "@/components/BucketSelect";
import { ActionButton } from "@/components/ActionButton";
import { formatDateBR, formatDayMonth } from "@/lib/format";
import { monthLabel, monthShort } from "@/lib/month";
import { BUCKETS } from "@/lib/types";
import { Trash2, ArrowLeftRight, Search } from "lucide-react";

export default async function Fluxo({ searchParams }: { searchParams: SearchParams }) {
  const { month, sp } = await pageCtx(searchParams);
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const kind = one("tipo");
  const filter: TxFilter = {
    month,
    q: one("q"),
    accountId: one("conta"),
    kind: kind === "entrada" || kind === "saida" ? kind : undefined,
    bucket: BUCKETS.some((b) => b.value === one("class")) ? one("class") : undefined,
    from: isDate(one("de")),
    to: isDate(one("ate")),
    limit: 500,
  };
  const filtering = !!(filter.q || filter.accountId || filter.kind || filter.bucket || filter.from || filter.to);
  const flow = monthlyFlow(month, 6);
  const cur = flow[flow.length - 1];
  const txs = listTransactions(filter);
  const sum = txTotals(filter);
  const accounts = listAccounts();
  const cats = categoryNames();
  const totals = bucketTotals(month).filter((b) => b.bucket !== "ignorar");

  return (
    <>
      <PageHeader title="Fluxo de caixa" subtitle={`Entradas e saídas em ${monthLabel(month)}. Pagamentos de fatura e transferências ficam de fora para não contar em dobro.`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3"><Tile icon={ArrowDownLeft} tone="green" /><span className="text-sm text-muted">Entradas</span></div>
          <div className="mt-3"><Money cents={cur.entradas} size="lg" className="text-emerald-600 dark:text-emerald-400" /></div>
        </Card>
        <Card>
          <div className="flex items-center gap-3"><Tile icon={ArrowUpRight} tone="rose" /><span className="text-sm text-muted">Saídas</span></div>
          <div className="mt-3"><Money cents={cur.saidas} size="lg" /></div>
        </Card>
        <Card>
          <div className="flex items-center gap-3"><Tile icon={Scale} tone="blue" /><span className="text-sm text-muted">Resultado do mês</span></div>
          <div className="mt-3"><Money cents={cur.entradas - cur.saidas} size="lg" className={cur.entradas - cur.saidas < 0 ? "text-rose-600" : ""} /></div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={ArrowLeftRight} tone="blue" title="Últimos 6 meses" subtitle="Entradas x saídas" />
          <FlowChart data={flow.map((f) => ({ label: monthShort(f.month), entradas: f.entradas, saidas: f.saidas }))} />
        </Card>
        <Card>
          <CardHeader icon={Scale} tone="amber" title="Saídas por classificação" subtitle={monthLabel(month)} />
          {totals.length === 0 ? <Empty>Sem saídas neste mês.</Empty> : (
            <ul className="space-y-3">
              {totals.map((t) => (
                <li key={t.bucket} className="flex items-center justify-between text-sm">
                  <span>{BUCKETS.find((b) => b.value === t.bucket)?.label}</span>
                  <Money cents={t.total} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            icon={ArrowLeftRight}
            tone="slate"
            title={filtering ? "Resultado da busca" : "Transações do mês"}
            subtitle={<>{sum.count} lançamentos{sum.count > txs.length ? ` (mostrando ${txs.length})` : ""} · entradas <Brl cents={sum.entradas} /> · saídas <Brl cents={sum.saidas} />{filtering && !filter.from && !filter.to && filter.q ? " · todo o período" : ""}</>}
          />
          <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1.3fr_1fr_1fr_1fr_1fr_auto]">
            <input type="hidden" name="m" value={month} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input name="q" defaultValue={filter.q} placeholder="Buscar descrição, categoria ou valor" className={`${inputCls} pl-9`} />
            </div>
            <select name="conta" defaultValue={filter.accountId ?? ""} className={inputCls} aria-label="Conta">
              <option value="">Todas as contas</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.bank_name ? `${a.bank_name} · ` : ""}{a.name}</option>)}
            </select>
            <select name="tipo" defaultValue={filter.kind ?? ""} className={inputCls} aria-label="Tipo">
              <option value="">Entradas e saídas</option>
              <option value="saida">Só saídas</option>
              <option value="entrada">Só entradas</option>
            </select>
            <select name="class" defaultValue={filter.bucket ?? ""} className={inputCls} aria-label="Classificação">
              <option value="">Toda classificação</option>
              {BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <input type="date" name="de" defaultValue={filter.from} className={inputCls} aria-label="De" title="De" />
            <input type="date" name="ate" defaultValue={filter.to} className={inputCls} aria-label="Até" title="Até" />
            <div className="flex gap-2">
              <button type="submit" className={btnPrimary}>Filtrar</button>
              {filtering ? <Link href={`/fluxo?m=${month}`} className={btnGhost}>Limpar</Link> : null}
            </div>
          </form>
          {txs.length === 0 ? (
            <Empty>{filtering ? "Nada encontrado com esses filtros." : <>Nenhuma transação neste mês. Use &quot;Adicionar&quot; ou importe um extrato em Conexões.</>}</Empty>
          ) : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-medium">Data</th>
                    <th className="py-2 pr-3 font-medium">Descrição</th>
                    <th className="py-2 pr-3 font-medium">Conta</th>
                    <th className="py-2 pr-3 font-medium">Classificação</th>
                    <th className="py-2 pr-3 text-right font-medium">Valor</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} className="border-b border-line/60 last:border-0 hover:bg-soft/60">
                      <td className="py-2.5 pr-3 tabular-nums text-muted">{filtering ? formatDateBR(t.date) : formatDayMonth(t.date)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{t.description}</span>
                        {t.installment_number && t.total_installments ? (
                          <span className="ml-2 text-xs text-muted">{t.installment_number}/{t.total_installments}</span>
                        ) : null}
                        {t.bill_name ? <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{t.bill_name}</span> : null}
                        {t.transfer_pair && !t.bucket_override ? <span className="ml-2 rounded-full bg-soft px-2 py-0.5 text-[11px] text-muted" title="Transferência entre suas contas: não conta como gasto nem renda">transferência</span> : null}
                        <span className="block text-xs text-muted">{catLabel(t.category)}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-muted">{t.account_name}</td>
                      <td className="py-2.5 pr-3"><BucketSelect id={t.id} override={t.bucket_override} effective={t.bucket} /></td>
                      <td className={`py-2.5 pr-3 text-right font-medium tabular-nums ${t.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        <Money cents={t.amount} size="xs" showSign />
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-right">
                        <RuleButton description={t.description} categories={cats} />
                        <ActionButton action={deleteTransaction.bind(null, t.id)} confirm="Excluir esta transação?" title="Excluir" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                          <Trash2 className="size-4" />
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
