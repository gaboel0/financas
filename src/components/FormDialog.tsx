"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { ActionResult } from "@/server/actions/util";
import { Modal } from "./Modal";
import { btnGhost, btnPrimary } from "@/lib/ui";

/** Formulário em modal que chama uma server action e fecha ao concluir. */
export function FormDialog({
  open, onClose, title, action, submitLabel = "Salvar", children, instant,
}: {
  open: boolean;
  instant?: boolean;
  onClose: () => void;
  title: string;
  action: (fd: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title} instant={instant}>
      <form
        className="space-y-3"
        action={(fd) =>
          start(async () => {
            setError(null);
            const r = await action(fd);
            if (r.ok) {
              // o botão vira "✓ Salvo" verde por um instante antes de fechar
              setDone(true);
              await new Promise((ok) => setTimeout(ok, 650));
              setDone(false);
              onClose();
            }
            else setError(r.error);
          })
        }
      >
        {children}
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={`${btnPrimary} min-w-28 ${done ? "btn-success" : ""}`} disabled={pending}>
            {done ? (
              <span key="ok" className="pop inline-flex items-center gap-1.5"><Check className="size-4" strokeWidth={3} /> Salvo</span>
            ) : pending ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function useDialog() {
  const [open, setOpen] = useState(false);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}
