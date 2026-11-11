import { CheckCircle2, HandCoins, Pencil, Plus, Trash2, X } from "lucide-react";
import { listDebts, type Debt } from "@/server/repo/debts";
import { createDebt, deleteDebt, deleteDebtPayment, payDebt, updateDebt } from "@/server/actions/dividas";
import { Card, CardHeader, Empty, PageHeader, Pill, Progress } from "@/components/Card";
import { Money, Brl } from "@/components/Money";
import { ActionButton } from "@/components/ActionButton";
import { DialogButton } from "@/components/DialogButton";
import { DebtFields } from "@/components/DebtFields";
import { formatDateBR } from "@/lib/format";
import { todayISO } from "@/lib/month";
import { dueLabel } from "@/lib/debtDue";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";

export const dynamic = "force-dynamic";

const iconBtn = "rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink";

function DebtRow({ d }: { d: Debt }) {
  const due = dueLabel(d);
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-48 flex-1">
          <p className="font-semibold">{d.creditor}</p>
          {d.description ? <p className="text-sm text-muted">{d.description}</p> : null}
          {d.notes ? <p className="mt-0.5 text-xs text-muted">{d.notes}</p> : null}
        </div>
        {due ? <Pill tone={due.tone}>{due.text}</Pill> : null}
        <div className="text-right">
          <Money cents={d.remaining} size="sm" />
          {d.paid > 0 ? <p className="text-xs text-muted">de <Brl cents={d.amount} /></p> : null}
        </div>
        <div className="flex items-center gap-1">
          <DialogButton label={<><HandCoins className="size-4" /> Pagar</>} title={`Pagar ${d.creditor}`} action={payDebt} submitLabel="Registrar pagamento" className={btnGhost}>
            <input type="hidden" name="id" value={d.id} />
            <p className="text-sm text-muted">Falta <Brl cents={d.remaining} />. Deixe o valor em branco para quitar tudo.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Valor pago (R$)</label><input name="amount" inputMode="decimal" placeholder="tudo" className={inputCls} /></div>
              <div><label className={labelCls}>Data</label><input name="date" type="date" defaultValue={todayISO()} className={inputCls} /></div>
            </div>
          </DialogButton>
          <DialogButton label={<Pencil className="size-4" aria-label="Editar" />} title="Editar dívida" action={updateDebt} className={iconBtn}>
            <DebtFields debt={d} />
          </DialogButton>
          <ActionButton action={deleteDebt.bind(null, d.id)} confirm={`Excluir a dívida com ${d.creditor}? Os pagamentos registrados também somem.`} title="Excluir" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
            <Trash2 className="size-4" />
          </ActionButton>
        </div>
      </div>
      {d.paid > 0 ? (
        <div className="mt-3">
          <Progress value={d.paid / d.amount} tone="green" />
          <ul className="mt-2 flex flex-wrap gap-2">
            {d.payments.map((p) => (
              <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-soft py-0.5 pl-2.5 pr-1 text-xs text-muted">
                {formatDateBR(p.date)} · <Brl cents={p.amount} />
                <ActionButton action={deleteDebtPayment.bind(null, p.id)} confirm="Desfazer este pagamento?" title="Desfazer pagamento" className="rounded-full p-0.5 hover:text-rose-600">
                  <X className="size-3" />
                </ActionButton>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

export default function Dividas() {
  const { open, settled, totalOpen } = listDebts();
  return (
    <>
      <PageHeader
        title="Dívidas"
        subtitle="Coisas avulsas que você está devendo: anote, pague em partes e acompanhe o que falta."
        right={
          <DialogButton label={<><Plus className="size-4" /> Nova dívida</>} title="Nova dívida" action={createDebt} submitLabel="Adicionar" className={btnPrimary}>
            <DebtFields />
          </DialogButton>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={HandCoins} tone="rose" title="Em aberto" subtitle={`${open.length} ${open.length === 1 ? "dívida" : "dívidas"}`} />
          <p className="text-xs text-muted">Total que você deve</p>
          <Money cents={totalOpen} size="xl" />
          {open.length === 0 ? (
            <div className="mt-5"><Empty>Nada em aberto. Use &quot;Nova dívida&quot; para anotar algo que você está devendo.</Empty></div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {open.map((d) => <DebtRow key={d.id} d={d} />)}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader icon={CheckCircle2} tone="green" title="Quitadas" subtitle="Já pagas" />
          {settled.length === 0 ? <Empty>Nenhuma quitada ainda.</Empty> : (
            <ul className="divide-y divide-line text-sm">
              {settled.slice(0, 30).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.creditor}</p>
                    <p className="text-xs text-muted">quitada em {formatDateBR(d.settled_at!.slice(0, 10))}</p>
                  </div>
                  <span className="flex items-center gap-1">
                    <span className="tabular-nums text-muted"><Brl cents={d.amount} /></span>
                    <ActionButton action={deleteDebt.bind(null, d.id)} confirm={`Apagar o registro da dívida com ${d.creditor}?`} title="Apagar" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                      <Trash2 className="size-4" />
                    </ActionButton>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
