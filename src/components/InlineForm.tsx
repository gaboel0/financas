"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/server/actions/util";
import { btnPrimary } from "@/lib/ui";

/** Formulário simples (sem modal) ligado a uma server action. */
export function InlineForm({
  action, children, submitLabel = "Salvar", className = "",
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className={className}
      action={(fd) =>
        start(async () => {
          const r = await action(fd);
          setMsg(r.ok ? { ok: true, text: "Salvo." } : { ok: false, text: r.error });
        })
      }
    >
      {children}
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Salvando..." : submitLabel}</button>
        {msg ? <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
