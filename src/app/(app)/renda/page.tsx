import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { pageCtx, type SearchParams } from "@/server/ctx";
import { incomeOf, incomeOverride, incomesInMonth } from "@/server/repo/incomes";
import { addIncome, deleteIncome, setIncomeOverride, updateIncome } from "@/server/actions/renda";
import { Card, CardHeader, Empty, PageHeader, Pill } from "@/components/Card";
import { Money } from "@/components/Money";
import { ActionButton } from "@/components/ActionButton";
import { DialogButton } from "@/components/DialogButton";
import { centsToInput } from "@/lib/format";
import { monthLabel } from "@/lib/month";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";

export default async function Renda({ searchParams }: { searchParams: SearchParams }) {
  const { month, me } = await pageCtx(searchParams);
  const list = incomesInMonth(me.id, month);
  const ov = incomeOverride(me.id, month);

  return (
    <>
      <PageHeader title="Renda" subtitle={`Quanto entra em ${monthLabel(month)}.`} />
      <div className="grid gap-6">
            <Card>
              <CardHeader
                icon={Wallet}
                tone="blue"
                title="Sua renda"
                subtitle={ov !== null ? "Valor ajustado só para este mês" : "Soma das rendas ativas"}
                right={
                  <DialogButton
                    label={<><Plus className="size-4" /> Renda</>}
                    title="Nova renda"
                    action={addIncome}
                    submitLabel="Adicionar"
                    className={btnGhost}
                  >
                    <div><label className={labelCls}>Descrição</label><input name="description" defaultValue="Salário" required className={inputCls} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Valor (R$)</label><input name="amount" required inputMode="decimal" className={inputCls} /></div>
                      <div><label className={labelCls}>Mês (se avulsa)</label><input name="month" type="month" defaultValue={month} className={inputCls} /></div>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="recurring" defaultChecked className="size-4 accent-blue-600" /> Recorrente (todo mês)</label>
                  </DialogButton>
                }
              />
              <Money cents={incomeOf(me.id, month)} size="lg" />
              {ov !== null ? <div className="mt-2"><Pill tone="amber">override de {monthLabel(month)}</Pill></div> : null}

              <ul className="mt-5 divide-y divide-line">
                {list.length === 0 ? <li className="py-3"><Empty>Nenhuma renda cadastrada.</Empty></li> : null}
                {list.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{i.description}</p>
                      <p className="text-xs text-muted">{i.recurring ? "todo mês" : `só em ${monthLabel(i.month ?? month)}`}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Money cents={i.amount} size="sm" />
                      <DialogButton label={<Pencil className="size-4" />} title="Editar renda" action={updateIncome} className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink">
                        <input type="hidden" name="id" value={i.id} />
                        <div><label className={labelCls}>Descrição</label><input name="description" defaultValue={i.description} required className={inputCls} /></div>
                        <div><label className={labelCls}>Valor (R$)</label><input name="amount" defaultValue={centsToInput(i.amount)} required inputMode="decimal" className={inputCls} /></div>
                      </DialogButton>
                      <ActionButton action={deleteIncome.bind(null, i.id)} confirm={`Excluir "${i.description}"?`} title="Excluir" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                        <Trash2 className="size-4" />
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-line pt-4">
                <DialogButton
                  label={`Ajustar renda de ${monthLabel(month)}`}
                  title={`Renda de ${monthLabel(month)}`}
                  action={setIncomeOverride}
                  className={`${btnPrimary} w-full`}
                >
                  <input type="hidden" name="month" value={month} />
                  <p className="text-sm text-muted">Use para 13º, bônus, férias ou um mês fora do normal. Deixe em branco para voltar ao valor padrão.</p>
                  <div><label className={labelCls}>Total do mês (R$)</label><input name="amount" defaultValue={ov !== null ? centsToInput(ov) : ""} inputMode="decimal" className={inputCls} /></div>
                </DialogButton>
              </div>
            </Card>
      </div>
    </>
  );
}
