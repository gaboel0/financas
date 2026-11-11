"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isMonth } from "@/lib/month";

/** Mês / Geral no meio da navbar. Só aparece na Visão geral, que é a página que muda com ele. */
export function PeriodToggle() {
  const pathname = usePathname();
  const sp = useSearchParams();
  if (pathname !== "/") return null;
  const m = sp.get("m");
  const base = isMonth(m) ? `/?m=${m}` : "/";
  const geral = sp.get("p") === "geral";
  const tab = "px-5 py-1.5 text-center text-sm font-medium";
  return (
    <div className="seg w-44 [--n:2]">
      <Link href={base} scroll={false} className={tab} data-active={!geral || undefined}>Mês</Link>
      <Link href={`${base}${base.includes("?") ? "&" : "?"}p=geral`} scroll={false} className={tab} data-active={geral || undefined}>Geral</Link>
    </div>
  );
}
