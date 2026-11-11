import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "../Card";
import { Brl } from "../Money";
import { ActionButton } from "../ActionButton";
import { DialogButton } from "../DialogButton";
import { addCalendarEvent, deleteCalendarEvent } from "@/server/actions/calendar";
import type { DayItem, getCalendar } from "@/server/repo/calendar";
import { formatDayMonth } from "@/lib/format";
import { addDays } from "@/lib/month";
import { btnGhost, inputCls, labelCls } from "@/lib/ui";

const DOW = ["S", "T", "Q", "Q", "S", "S", "D"];
const KIND_TXT: Record<string, string> = { ferias: "Férias", folga: "Folga", feriado: "Feriado", evento: "Evento" };

function dayClass(items: DayItem[], weekend: boolean): string {
  const has = (t: DayItem["type"]) => items.some((i) => i.type === t);
  if (has("ferias")) return "bg-sky-500/20 text-sky-700 dark:text-sky-300";
  if (has("folga")) return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (has("feriado")) return "bg-amber-400/20 text-amber-700 dark:text-amber-300";
  if (has("viagem")) return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
  return weekend ? "text-muted" : "";
}

/** Calendário do mês: feriados nacionais automáticos, férias/folgas/eventos, contas, faturas e viagens. */
export function Calendario({ data, today }: { data: ReturnType<typeof getCalendar>; today: string }) {
  const { from, to, days } = data;
  const lead = (new Date(from + "T12:00:00Z").getUTCDay() + 6) % 7; // segunda = 0
  const total = +to.slice(8, 10);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => addDays(from, i)),
  ];
  while (cells.length % 7) cells.push(null);

  // lista abaixo do calendário: tudo menos contas/faturas (essas já estão em Contas a pagar), agrupado por período
  const seen = new Set<string>();
  const lista: { start: string; end: string; it: DayItem }[] = [];
  for (const d of Object.keys(days).sort()) {
    for (const it of days[d]) {
      if (it.type === "conta" || it.type === "fatura") continue;
      const key = `${it.type}|${it.label}|${it.eventId ?? ""}`;
      if (seen.has(key)) { lista.find((l) => `${l.it.type}|${l.it.label}|${l.it.eventId ?? ""}` === key)!.end = d; continue; }
      seen.add(key);
      lista.push({ start: d, end: d, it });
    }
  }
  const defDate = today >= from && today <= to ? today : from;

  return (
    <Card>
      <CardHeader
        icon={CalendarDays}
        tone="sky"
        title="Calendário"
        subtitle="Feriados entram sozinhos; marque férias e folgas"
        right={
          <DialogButton label={<><Plus className="size-4" /> Marcar</>} title="Marcar no calendário" action={addCalendarEvent} submitLabel="Marcar" className={btnGhost}>
            <div className="seg text-sm [--n:4]">
              {(["ferias", "folga", "feriado", "evento"] as const).map((k, i) => (
                <label key={k} className="cursor-pointer px-2 py-1.5 text-center">
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="sr-only" /> {KIND_TXT[k]}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>De</label><input name="start_date" type="date" required defaultValue={defDate} className={inputCls} /></div>
              <div><label className={labelCls}>Até</label><input name="end_date" type="date" defaultValue={defDate} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Nome (opcional, menos pra evento)</label><input name="title" placeholder="Ex.: Aniversário da mãe, feriado municipal" className={inputCls} /></div>
          </DialogButton>
        }
      />

      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d, i) => <span key={i} className="pb-1 text-[11px] font-medium text-muted">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const items = days[d] ?? [];
          const contas = items.filter((x) => x.type === "conta" || x.type === "fatura");
          const tip = items.map((x) => `${x.label}${x.amount ? ` (R$ ${(x.amount / 100).toFixed(2).replace(".", ",")}${x.paid ? ", pago" : ""})` : ""}`).join("\n");
          return (
            <div
              key={d}
              title={tip || undefined}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums ${dayClass(items, i % 7 >= 5)} ${d === today ? "ring-2 ring-primary" : ""}`}
            >
              {+d.slice(8, 10)}
              {contas.length ? (
                <span className="absolute bottom-1 flex gap-0.5">
                  {contas.slice(0, 3).map((c, k) => (
                    <span key={k} className={`size-1 rounded-full ${c.type === "fatura" ? "bg-violet-400" : c.paid ? "bg-emerald-500" : "bg-rose-500"}`} />
                  ))}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-400/60" />feriado</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-sky-500/60" />férias/folga</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-violet-500/50" />viagem</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-rose-500" />conta a pagar</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" />paga</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-violet-400" />fatura</span>
      </div>

      {lista.length ? (
        <ul className="mt-4 divide-y divide-line">
          {lista.map(({ start, end, it }) => (
            <li key={`${it.type}${it.label}${start}`} className="flex items-center gap-2 py-2 text-sm">
              <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted">
                {formatDayMonth(start)}{end !== start ? `–${formatDayMonth(end)}` : ""}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {it.label}
                {it.type === "feriado" && it.optional ? <span className="text-[11px] text-muted"> · facultativo</span> : null}
              </span>
              {it.amount ? <Brl cents={it.amount} /> : null}
              {it.eventId ? (
                <ActionButton action={deleteCalendarEvent.bind(null, it.eventId)} confirm={`Apagar "${it.label}" do calendário?`} title="Apagar" className="rounded-lg p-1 text-muted hover:bg-soft hover:text-rose-600">
                  <Trash2 className="size-3.5" />
                </ActionButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
