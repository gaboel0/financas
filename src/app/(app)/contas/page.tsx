import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { pageCtx, type SearchParams } from "@/server/ctx";
import { listInstances } from "@/server/calc/contas";
import { listBills } from "@/server/repo/bills";
import { createBill, deleteBill, setInstanceAmountForm, updateBill } from "@/server/actions/contas";
import { Card, CardHeader, Empty, PageHeader, Pill } from "@/components/Card";
import { Money } from "@/components/Money";
import { Tile } from "@/components/Tile";
import { PaidCheckbox } from "@/components/PaidCheckbox";
import { ActionButton } from "@/components/ActionButton";
import { DialogButton } from "@/components/DialogButton";
import { BillFormFields } from "@/components/BillForm";
import { centsToInput, formatDateBR } from "@/lib/format";
import { monthLabel, todayISO } from "@/lib/month";
import { btnPrimary, inputCls, labelCls } from "@/lib/ui";

export default async function Contas({ searchParams }: { searchParams: SearchParams }) {
  const { month } = await pageCtx(searchParams);
  const instances = listInstances(month);
  const bills = new Map(listBills().map((b) => [b.id, b]));
  const today = todayISO();
  const total = instances.reduce((s, i) => s + i.amount, 0);
  const paid = instances.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <PageHeader
        title="Contas fixas"
        subtitle={`Vencimentos de ${monthLabel(month)}. Marque como paga ou deixe o app vincular o pagamento automaticamente pelo extrato.`}
        right={
          <DialogButton label={<><Plus className="size-4" /> Nova conta</>} title="Nova conta" action={createBill} submitLabel="Criar conta" className={btnPrimary}>
            <BillFormFields month={month} />
          </DialogButton>
        }
      />
      <Card>
        <CardHeader
          icon={Receipt}
          tone="rose"
          title={`${instances.length} contas no mês`}
          subtitle={<>Total <Money cents={total} size="xs" className="inline-flex" /> · pago <Money cents={paid} size="xs" className="inline-flex" /></>}
        />
        {instances.length === 0 ? (
          <Empty>Nenhuma conta cadastrada ainda.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {instances.map((i) => {
              const bill = bills.get(i.bill_id);
              const late = !i.paid && i.due_date < today;
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                  <PaidCheckbox instanceId={i.id} paid={Boolean(i.paid)} label={i.name} />
                  <Tile icon={i.icon} tone={i.scope === "house" ? "blue" : "violet"} />
                  <div className="min-w-40 flex-1">
                    <p className={`text-sm font-medium ${i.paid ? "text-muted line-through" : ""}`}>{i.name}</p>
                    <p className="text-xs text-muted">
                      vence {formatDateBR(i.due_date)} · {i.scope === "house" ? "casa" : "pessoal"}
                      {i.transaction_id ? " · vinculada ao extrato" : ""}
                    </p>
                  </div>
                  {late ? <Pill tone="rose">atrasada</Pill> : i.paid ? <Pill tone="green">paga</Pill> : <Pill tone="slate">em aberto</Pill>}
                  <Money cents={i.amount} size="sm" />
                  <div className="flex items-center gap-1">
                    <DialogButton
                      label="Valor do mês"
                      title={`Valor de ${i.name} em ${monthLabel(month)}`}
                      action={setInstanceAmountForm}
                      className="rounded-lg px-2 py-1 text-xs text-primary hover:bg-blue-50 dark:hover:bg-blue-500/10"
                    >
                      <input type="hidden" name="id" value={i.id} />
                      <label className={labelCls}>Valor real (R$)</label>
                      <input name="amount" defaultValue={centsToInput(i.amount)} inputMode="decimal" className={inputCls} />
                    </DialogButton>
                    {bill ? (
                      <DialogButton label={<Pencil className="size-4" />} title={`Editar ${bill.name}`} action={updateBill} className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink">
                        <BillFormFields bill={bill} month={month} />
                      </DialogButton>
                    ) : null}
                    <ActionButton action={deleteBill.bind(null, i.bill_id)} confirm={`Remover "${i.name}" de todos os meses?`} title="Remover conta" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                      <Trash2 className="size-4" />
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
