"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell as BellIcon } from "lucide-react";
import { Brl } from "./Money";
import { formatDayMonth } from "@/lib/format";

type Item = { id: number; name: string; amount: number; due_date: string; days: number; overdue: boolean };

export function Bell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (r.ok) setItems(((await r.json()) as { items: Item[] }).items);
    } catch {
      /* servidor reiniciando */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const when = (i: Item) =>
    i.days < 0 ? `atrasada há ${-i.days} ${-i.days === 1 ? "dia" : "dias"}` : i.days === 0 ? "vence hoje" : `em ${i.days} ${i.days === 1 ? "dia" : "dias"}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); void load(); }}
        aria-label="Notificações"
        className="relative inline-flex size-9 items-center justify-center rounded-xl bg-card text-muted transition hover:bg-soft hover:text-ink"
      >
        <BellIcon className="size-4" />
        {items.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="card-shadow absolute right-0 z-40 mt-2 w-80 rounded-2xl bg-card p-2">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Próximos 7 dias</p>
          {items.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-muted">Nenhuma conta pendente por aqui. Tudo em dia.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-soft">
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className={`text-xs ${i.overdue ? "text-rose-600 dark:text-rose-400" : "text-muted"}`}>
                      {formatDayMonth(i.due_date)} - {when(i)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums"><Brl cents={i.amount} /></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
