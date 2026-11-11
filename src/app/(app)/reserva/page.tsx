import { Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { pageCtx, type SearchParams } from "@/server/ctx";
import { listGoals, type GoalView } from "@/server/calc/metas";
import { addGoalEntry, createGoal, deleteGoal, deleteGoalEntry, updateGoal } from "@/server/actions/metas";
import { Card, CardHeader, Empty, PageHeader, Pill, Progress } from "@/components/Card";
import { Money } from "@/components/Money";
import { GoalChart } from "@/components/charts/GoalChart";
import { ActionButton } from "@/components/ActionButton";
import { DialogButton } from "@/components/DialogButton";
import { ICON_OPTIONS } from "@/components/icons";
import { centsToInput, formatDateBR, formatPct } from "@/lib/format";
import { monthShort, todayISO } from "@/lib/month";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";

function GoalFields({ g }: { g?: GoalView }) {
  return (
    <>
      {g ? <input type="hidden" name="id" value={g.id} /> : null}
      <div><label className={labelCls}>Nome</label><input name="name" required defaultValue={g?.name} placeholder="Ex.: Viagem de fim de ano" className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select name="kind" defaultValue={g?.kind ?? "reserva"} className={inputCls}>
            <option value="reserva">Reserva</option>
            <option value="projeto">Projeto (obra, viagem...)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Ícone</label>
          <select name="icon" defaultValue={g?.icon ?? "piggy-bank"} className={inputCls}>
            {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Meta (R$)</label><input name="target_amount" required inputMode="decimal" defaultValue={g ? centsToInput(g.target_amount) : ""} className={inputCls} /></div>
        <div><label className={labelCls}>Aporte mensal (R$)</label><input name="monthly_contribution" inputMode="decimal" defaultValue={g ? centsToInput(g.monthly_contribution) : ""} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Rendimento (% ao mês) - opcional</label><input name="interest_rate_monthly" inputMode="decimal" defaultValue={g?.interest_rate_monthly ?? ""} placeholder="ex.: 1,2" className={inputCls} /></div>
      <div><label className={labelCls}>Observações</label><textarea name="notes" rows={2} defaultValue={g?.notes ?? ""} className={inputCls} /></div>
    </>
  );
}

export default async function Reserva({ searchParams }: { searchParams: SearchParams }) {
  await pageCtx(searchParams);
  const goals = listGoals();
  const today = todayISO();

  return (
    <>
      <PageHeader
        title="Reserva"
        subtitle="Reserva de emergência e projetos, com aportes, rendimento e prazo estimado."
        right={
          <DialogButton label={<><Plus className="size-4" /> Nova meta</>} title="Nova meta" action={createGoal} submitLabel="Criar meta" className={btnPrimary}>
            <GoalFields />
          </DialogButton>
        }
      />
      {goals.length === 0 ? (
        <Empty>Nenhuma meta ainda. Crie a reserva de emergência para começar.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id}>
              <CardHeader
                icon={g.icon ?? PiggyBank}
                tone={g.kind === "reserva" ? "green" : "amber"}
                title={g.name}
                subtitle={g.notes ?? (g.kind === "reserva" ? "Reserva" : "Projeto")}
                right={
                  <div className="flex items-center gap-1">
                    <DialogButton label={<Pencil className="size-4" />} title={`Editar ${g.name}`} action={updateGoal} className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink">
                      <GoalFields g={g} />
                    </DialogButton>
                    <ActionButton action={deleteGoal.bind(null, g.id)} confirm={`Excluir a meta "${g.name}" e todo o histórico?`} title="Excluir meta" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                      <Trash2 className="size-4" />
                    </ActionButton>
                  </div>
                }
              />
              <div className="flex items-baseline justify-between gap-2">
                <Money cents={g.saldo} size="xl" />
                <span className="text-lg font-semibold text-primary">{formatPct(g.progresso)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">de <Money cents={g.target_amount} size="xs" className="inline-flex" /></p>
              <div className="mt-3"><Progress value={g.progresso} tone={g.kind === "reserva" ? "green" : "primary"} /></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {g.mesesRestantes !== null ? <Pill tone="blue">{g.mesesRestantes === 0 ? "Meta atingida" : `${g.mesesRestantes} ${g.mesesRestantes === 1 ? "mês" : "meses"} para a meta`}</Pill> : <Pill tone="slate">defina um aporte para estimar o prazo</Pill>}
                {g.monthly_contribution > 0 ? <Pill tone="slate">aporte <Money cents={g.monthly_contribution} size="xs" className="ml-1 inline-flex" /></Pill> : null}
                {g.interest_rate_monthly ? <Pill tone="green">{g.interest_rate_monthly.toLocaleString("pt-BR")}% a.m. · juros ~<Money cents={g.jurosEstimado} size="xs" className="mx-1 inline-flex" />/mês</Pill> : null}
              </div>

              <div className="mt-5">
                <GoalChart id={`g${g.id}`} data={g.entries.map((e) => ({ label: monthShort(e.date.slice(0, 7)), saldo: e.balance_after }))} target={g.target_amount} color={g.kind === "reserva" ? "#10b981" : "#2563eb"} />
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm font-medium">Movimentações</p>
                <DialogButton label={<><Plus className="size-4" /> Aporte</>} title={`Movimentar ${g.name}`} action={addGoalEntry} submitLabel="Registrar" className={btnGhost}>
                  <input type="hidden" name="goal_id" value={g.id} />
                  <div className="seg text-sm">
                    <label className="cursor-pointer px-3 py-1.5 text-center"><input type="radio" name="type" value="aporte" defaultChecked className="sr-only" /> Aporte</label>
                    <label className="cursor-pointer px-3 py-1.5 text-center"><input type="radio" name="type" value="retirada" className="sr-only" /> Retirada</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Valor (R$)</label><input name="amount" required inputMode="decimal" className={inputCls} /></div>
                    <div><label className={labelCls}>Data</label><input name="date" type="date" defaultValue={today} className={inputCls} /></div>
                  </div>
                  <div><label className={labelCls}>Rendimento do período (R$) - opcional</label><input name="interest" inputMode="decimal" placeholder="soma ao saldo" className={inputCls} /></div>
                </DialogButton>
              </div>
              {g.entries.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nenhum aporte registrado.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {[...g.entries].reverse().slice(0, 8).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="w-24 tabular-nums text-muted">{formatDateBR(e.date)}</span>
                      <Money cents={e.amount} size="xs" showSign className={e.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"} />
                      <span className="flex-1 text-right text-xs text-muted">saldo <Money cents={e.balance_after} size="xs" className="inline-flex text-ink" /></span>
                      <ActionButton action={deleteGoalEntry.bind(null, e.id)} confirm="Excluir esta movimentação?" title="Excluir" className="rounded-lg p-1 text-muted hover:text-rose-600">
                        <Trash2 className="size-3.5" />
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
