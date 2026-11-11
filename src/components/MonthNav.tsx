"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentMonth, isMonth, monthLabel } from "@/lib/month";

export function MonthNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const raw = sp.get("m");
  const m = isMonth(raw) ? raw : currentMonth();
  const href = (mm: string) => (mm === currentMonth() ? pathname : `${pathname}?m=${mm}`);
  const btn = "inline-flex size-9 items-center justify-center rounded-xl bg-card text-muted transition hover:bg-soft hover:text-ink";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(addMonths(m, -1))} aria-label="Mês anterior" className={btn}><ChevronLeft className="size-4" /></Link>
      <div className="min-w-40 rounded-xl bg-card px-4 py-2 text-center text-sm font-medium">{monthLabel(m).charAt(0).toUpperCase() + monthLabel(m).slice(1)}</div>
      <Link href={href(addMonths(m, 1))} aria-label="Próximo mês" className={btn}><ChevronRight className="size-4" /></Link>
      {m !== currentMonth() ? (
        <Link href={pathname} className="rounded-xl px-3 py-2 text-sm font-medium text-primary hover:bg-blue-50 dark:hover:bg-blue-500/10">Hoje</Link>
      ) : null}
    </div>
  );
}
