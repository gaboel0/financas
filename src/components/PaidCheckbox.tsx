"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { togglePaid } from "@/server/actions/contas";

export function PaidCheckbox({ instanceId, paid, label }: { instanceId: number; paid: boolean; label: string }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(paid);
  const [clicked, setClicked] = useState(false);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${optimistic ? "Desmarcar" : "Marcar"} ${label} como paga`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setClicked(true);
          setOptimistic(!optimistic);
          await togglePaid(instanceId, !optimistic);
        })
      }
      className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
        optimistic ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 bg-card hover:border-primary dark:border-neutral-600"
      }`}
    >
      {optimistic ? <Check className={`${clicked ? "pop" : ""} size-3.5`} strokeWidth={3} /> : null}
    </button>
  );
}
