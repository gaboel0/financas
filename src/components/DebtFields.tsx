import { centsToInput } from "@/lib/format";
import { inputCls, labelCls } from "@/lib/ui";

type DebtLike = { id: number; creditor: string; description: string | null; amount: number; due_date: string | null; notes: string | null };

/** Campos do formulário de dívida (nova ou edição). */
export function DebtFields({ debt }: { debt?: DebtLike }) {
  return (
    <>
      {debt ? <input type="hidden" name="id" value={debt.id} /> : null}
      <div>
        <label className={labelCls}>Pra quem você deve</label>
        <input name="creditor" required defaultValue={debt?.creditor} placeholder="Ex.: João, Mãe, Loja X" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Do quê (opcional)</label>
        <input name="description" defaultValue={debt?.description ?? ""} placeholder="Ex.: churrasco, empréstimo" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Valor total (R$)</label>
          <input name="amount" required inputMode="decimal" defaultValue={debt ? centsToInput(debt.amount) : ""} placeholder="0,00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Vencimento (opcional)</label>
          <input name="due_date" type="date" defaultValue={debt?.due_date ?? ""} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Observação (opcional)</label>
        <input name="notes" defaultValue={debt?.notes ?? ""} className={inputCls} />
      </div>
    </>
  );
}
