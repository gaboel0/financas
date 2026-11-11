"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/server/actions/util";

/** Botão que dispara uma server action (já "bound") com estado de carregamento e confirmação opcional. */
export function ActionButton({
  action, children, className = "", confirm, title,
}: {
  action: () => Promise<ActionResult | void>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        title={title}
        disabled={pending}
        className={className}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const r = await action();
            if (r && !r.ok) setError(r.error);
          });
        }}
      >
        {pending ? "..." : children}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </>
  );
}
