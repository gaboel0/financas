import { Wifi } from "lucide-react";
import { cardClass } from "@/lib/cardTheme";
import { Brl } from "./Money";

import type { Account } from "@/lib/types";

/** Face do cartão de crédito: preto escovado, laranja etc. conforme o banco. */
export function CardFace({
  account, open, compact = false,
}: {
  account: Account;
  open?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`${cardClass(account.color, account.bank_name)} relative flex flex-col justify-between overflow-hidden rounded-2xl text-white shadow-lg ${
        compact ? "aspect-[1.75/1] min-w-0 p-3.5" : "aspect-[1.65/1] w-full max-w-sm p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate font-semibold tracking-wide ${compact ? "text-xs" : "text-sm"}`}>{account.bank_name ?? "Cartão"}</p>
          {compact ? null : <p className="truncate text-xs text-white/70">{account.name}</p>}
        </div>
        <Wifi className={`shrink-0 rotate-90 text-white/70 ${compact ? "size-4" : "size-5"}`} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className={`tracking-[0.2em] text-white/80 ${compact ? "text-[10px]" : "text-sm"}`}>•••• {account.number_last4 ?? "----"}</p>
          {open !== undefined ? (
            <p className={`mt-0.5 truncate font-semibold tabular-nums ${compact ? "text-sm" : "text-xl"}`}><Brl cents={open} /></p>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full bg-white/25 ring-2 ring-white/30 ${compact ? "size-5" : "size-7"}`} />
      </div>
    </div>
  );
}
