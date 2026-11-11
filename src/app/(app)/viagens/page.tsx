import Link from "next/link";
import {
  BedDouble, Bus, Check, MapPin, Package, Pencil, Plane, Plus, ShoppingBag, Ticket, Trash2, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import type { SearchParams } from "@/server/ctx";
import { getTrip, listTrips, TRIP_CATEGORIES, type Trip } from "@/server/repo/viagens";
import { addTripItem, deleteTrip, deleteTripItem, saveTrip, toggleTripItemPaid } from "@/server/actions/viagens";
import { Card, CardHeader, Empty, PageHeader, Pill, Progress } from "@/components/Card";
import { Brl, Money } from "@/components/Money";
import { ActionButton } from "@/components/ActionButton";
import { DialogButton } from "@/components/DialogButton";
import { formatDateBR, formatDayMonth } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";

export const dynamic = "force-dynamic";

const CAT_ICON: Record<string, LucideIcon> = {
  transporte: Bus, hospedagem: BedDouble, alimentacao: UtensilsCrossed, passeios: Ticket, compras: ShoppingBag, outros: Package,
};
const STATUS: Record<string, { label: string; tone: "green" | "blue" | "slate" | "amber" }> = {
  andamento: { label: "acontecendo", tone: "green" },
  futura: { label: "planejada", tone: "blue" },
  "sem data": { label: "sem data", tone: "amber" },
  passada: { label: "já foi", tone: "slate" },
};

function periodo(t: Pick<Trip, "start_date" | "end_date">): string {
  if (!t.start_date) return "sem data";
  if (!t.end_date || t.end_date === t.start_date) return formatDateBR(t.start_date);
  return `${formatDayMonth(t.start_date)} a ${formatDateBR(t.end_date)}`;
}

function TripForm({ trip }: { trip?: Trip }) {
  const money = (c: number | null | undefined) => (c != null ? (c / 100).toFixed(2).replace(".", ",") : "");
  return (
    <>
      {trip ? <input type="hidden" name="id" value={trip.id} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Nome</label><input name="name" required defaultValue={trip?.name} placeholder="Ex.: Fim de semana em SP" className={inputCls} /></div>
        <div><label className={labelCls}>Destino</label><input name="destination" defaultValue={trip?.destination ?? ""} placeholder="Ex.: São Paulo" className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Ida</label><input name="start_date" type="date" defaultValue={trip?.start_date ?? ""} className={inputCls} /></div>
        <div><label className={labelCls}>Volta</label><input name="end_date" type="date" defaultValue={trip?.end_date ?? ""} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Orçamento (opcional)</label><input name="budget" inputMode="decimal" defaultValue={money(trip?.budget)} placeholder="0,00" className={inputCls} /></div>
        <div><label className={labelCls}>Quantas pessoas</label><input name="people" type="number" min={1} defaultValue={trip?.people ?? 1} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Anotações</label><textarea name="notes" rows={3} defaultValue={trip?.notes ?? ""} placeholder="Roteiro, reservas, o que levar..." className={inputCls} /></div>
    </>
  );
}

export default async function Viagens({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const trips = listTrips();
  const selId = Number(sp.t) || trips[0]?.id;
  const d = selId ? getTrip(selId) : null;

  return (
    <>
      <PageHeader
        title="Viagens"
        subtitle="Planeje cada viagem: orçamento, passagem, hospedagem, comida, passeios. Marque o que já foi pago."
        right={
          <DialogButton label={<><Plus className="size-4" /> Nova viagem</>} title="Nova viagem" action={saveTrip} submitLabel="Criar" className={btnPrimary}>
            <TripForm />
          </DialogButton>
        }
      />

      {trips.length === 0 ? (
        <Card><Empty>Nenhuma viagem ainda. Use &quot;Nova viagem&quot; pra começar a planejar.</Empty></Card>
      ) : (
        <>
          <div className="-mx-1 mb-6 flex gap-3 overflow-x-auto px-1 pb-1">
            {trips.map((t) => {
              const sel = t.id === d?.trip.id;
              const st = STATUS[t.status];
              return (
                <Link
                  key={t.id}
                  href={`/viagens?t=${t.id}`}
                  className={`min-w-56 shrink-0 rounded-2xl border p-4 transition-colors ${sel ? "border-primary bg-card" : "border-line bg-card/60 hover:bg-card"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{t.name}</p>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted">{t.destination ? `${t.destination} · ` : ""}{periodo(t)}</p>
                  <p className="mt-3 text-sm font-semibold tabular-nums"><Brl cents={t.total} /></p>
                  {t.budget ? <p className="text-[11px] text-muted">de <Brl cents={t.budget} /> de orçamento</p> : <p className="text-[11px] text-muted">{t.total ? "total planejado" : "sem custos ainda"}</p>}
                </Link>
              );
            })}
          </div>

          {d ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  icon={Plane}
                  tone="sky"
                  title={d.trip.name}
                  subtitle={`${d.trip.destination ? `${d.trip.destination} · ` : ""}${periodo(d.trip)}${d.dias ? ` · ${d.dias} ${d.dias === 1 ? "dia" : "dias"}` : ""}`}
                  right={
                    <div className="flex items-center gap-1">
                      <DialogButton label={<Pencil className="size-4" />} title="Editar viagem" action={saveTrip} submitLabel="Salvar" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink">
                        <TripForm trip={d.trip} />
                      </DialogButton>
                      <ActionButton action={deleteTrip.bind(null, d.trip.id)} confirm={`Apagar a viagem "${d.trip.name}" e todos os custos dela?`} title="Apagar viagem" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                        <Trash2 className="size-4" />
                      </ActionButton>
                    </div>
                  }
                />
                <p className="text-xs text-muted">Custo total</p>
                <Money cents={d.total} size="xl" />
                {d.trip.budget ? (
                  <div className="mt-4">
                    <Progress value={d.total / d.trip.budget} tone={d.total > d.trip.budget ? "rose" : "primary"} />
                    <p className={`mt-1.5 text-xs ${d.sobraOrcamento! < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted"}`}>
                      {d.sobraOrcamento! >= 0
                        ? <>Sobram <Brl cents={d.sobraOrcamento!} /> do orçamento de <Brl cents={d.trip.budget} /></>
                        : <>Passou <Brl cents={-d.sobraOrcamento!} /> do orçamento de <Brl cents={d.trip.budget} /></>}
                    </p>
                  </div>
                ) : null}
                <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-soft px-3 py-2.5">
                    <dt className="text-[11px] text-muted">Já pago</dt>
                    <dd className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"><Brl cents={d.pago} /></dd>
                  </div>
                  <div className="rounded-xl bg-soft px-3 py-2.5">
                    <dt className="text-[11px] text-muted">Falta pagar</dt>
                    <dd className="text-sm font-semibold"><Brl cents={d.aPagar} /></dd>
                  </div>
                  <div className="rounded-xl bg-soft px-3 py-2.5">
                    <dt className="text-[11px] text-muted">Por dia</dt>
                    <dd className="text-sm font-semibold">{d.porDia != null ? <Brl cents={d.porDia} /> : "—"}</dd>
                  </div>
                  <div className="rounded-xl bg-soft px-3 py-2.5">
                    <dt className="text-[11px] text-muted">{d.trip.people > 1 ? `Por pessoa (${d.trip.people})` : "Faltam"}</dt>
                    <dd className="text-sm font-semibold">
                      {d.porPessoa != null ? <Brl cents={d.porPessoa} /> : d.faltamDias != null ? `${d.faltamDias} ${d.faltamDias === 1 ? "dia" : "dias"}` : "—"}
                    </dd>
                  </div>
                </dl>
                {d.trip.notes ? <p className="mt-5 whitespace-pre-line rounded-xl border border-line px-3 py-2.5 text-sm text-muted">{d.trip.notes}</p> : null}
              </Card>

              <Card>
                <CardHeader icon={MapPin} tone="violet" title="Por categoria" subtitle="Onde vai o dinheiro" />
                <ul className="space-y-3">
                  {d.porCategoria.filter((c) => c.total > 0).map((c) => {
                    const Icon = CAT_ICON[c.key];
                    return (
                      <li key={c.key}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2"><Icon className="size-4 text-muted" />{c.label}</span>
                          <span className="font-semibold tabular-nums"><Brl cents={c.total} /></span>
                        </div>
                        <Progress value={d.total ? c.total / d.total : 0} />
                      </li>
                    );
                  })}
                </ul>
                {d.total === 0 ? <Empty>Sem custos ainda.</Empty> : null}
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader
                  icon={Ticket}
                  tone="amber"
                  title="Custos"
                  subtitle={`${d.items.length} ${d.items.length === 1 ? "item" : "itens"} · clique no círculo pra marcar como pago`}
                  right={
                    <DialogButton label={<><Plus className="size-4" /> Custo</>} title="Novo custo" action={addTripItem} submitLabel="Adicionar" className={btnGhost}>
                      <input type="hidden" name="trip_id" value={d.trip.id} />
                      <div>
                        <label className={labelCls}>Categoria</label>
                        <select name="category" defaultValue="transporte" className={inputCls}>
                          {TRIP_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      </div>
                      <div><label className={labelCls}>O que é</label><input name="description" required placeholder="Ex.: Hotel 2 noites" className={inputCls} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelCls}>Valor (R$)</label><input name="amount" required inputMode="decimal" placeholder="0,00" className={inputCls} /></div>
                        <div><label className={labelCls}>Data (opcional)</label><input name="date" type="date" className={inputCls} /></div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" name="paid" value="1" className="size-4 accent-[var(--primary)]" /> Já paguei</label>
                    </DialogButton>
                  }
                />
                {d.items.length === 0 ? (
                  <Empty>Nenhum custo ainda. Adicione passagem, hospedagem, comida...</Empty>
                ) : (
                  <ul className="divide-y divide-line">
                    {d.items.map((i) => {
                      const Icon = CAT_ICON[i.category] ?? Package;
                      return (
                        <li key={i.id} className="flex items-center gap-3 py-2.5">
                          <ActionButton
                            action={toggleTripItemPaid.bind(null, i.id)}
                            title={i.paid ? "Pago (clique pra desmarcar)" : "Marcar como pago"}
                            className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${i.paid ? "border-transparent bg-emerald-500 text-white" : "border-line text-transparent hover:text-muted"}`}
                          >
                            <Check className="size-3.5" />
                          </ActionButton>
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-soft text-muted"><Icon className="size-4" /></span>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium ${i.paid ? "text-muted line-through decoration-1" : ""}`}>{i.description}</p>
                            <p className="truncate text-[11px] text-muted">
                              {TRIP_CATEGORIES.find((c) => c.key === i.category)?.label ?? i.category}{i.date ? ` · ${formatDayMonth(i.date)}` : ""} · {i.paid ? "pago" : "a pagar"}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums"><Brl cents={i.amount} /></span>
                          <ActionButton action={deleteTripItem.bind(null, i.id)} confirm="Apagar este custo?" title="Apagar" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                            <Trash2 className="size-4" />
                          </ActionButton>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
