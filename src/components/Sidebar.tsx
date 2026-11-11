"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight, Building2, CreditCard, HandCoins, LayoutDashboard, PiggyBank, Plane, Plug, Receipt, Wallet, type LucideIcon,
} from "lucide-react";
import { isMonth } from "@/lib/month";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/fluxo", label: "Fluxo de caixa", icon: ArrowLeftRight },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/apartamento", label: "Apartamento", icon: Building2 },
  { href: "/viagens", label: "Viagens", icon: Plane },
  { href: "/reserva", label: "Reserva", icon: PiggyBank },
  { href: "/renda", label: "Renda", icon: Wallet },
  { href: "/contas", label: "Contas fixas", icon: Receipt },
  { href: "/dividas", label: "Dívidas", icon: HandCoins },
  { href: "/conexoes", label: "Conexões", icon: Plug },
];

function useNav() {
  const pathname = usePathname();
  const m = useSearchParams().get("m");
  const q = isMonth(m) ? `?m=${m}` : "";
  return NAV.map((n) => ({ ...n, to: n.href + q, active: n.href === "/" ? pathname === "/" : pathname.startsWith(n.href) }));
}

export function Sidebar({ name }: { name: string }) {
  const nav = useNav();
  return (
    <aside className="card-shadow sticky top-3 ml-3 mt-3 flex h-[calc(100vh-1.5rem)] w-64 flex-col overflow-hidden whitespace-nowrap rounded-2xl bg-card px-3 py-6 transition-[width] duration-300 ease-out group-data-[sidebar=closed]/shell:w-[4.5rem]">
      <div className="mb-8 flex items-center gap-3 px-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold uppercase text-white">{name.trim().charAt(0) || "V"}</span>
        <div className="transition-opacity duration-200 group-data-[sidebar=closed]/shell:opacity-0">
          <p className="text-[15px] font-semibold leading-tight">Finanças da Casa</p>
          <p className="text-xs text-muted">Suas finanças</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.to}
            title={n.label}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              n.active ? "bg-blue-50 font-medium text-primary dark:bg-blue-500/15 dark:text-blue-300" : "text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            <n.icon className="size-[18px] shrink-0" />
            <span className="transition-opacity duration-200 group-data-[sidebar=closed]/shell:opacity-0">{n.label}</span>
          </Link>
        ))}
      </nav>
      <p className="px-2 text-xs text-muted transition-opacity duration-200 group-data-[sidebar=closed]/shell:opacity-0">Dados só no seu computador.</p>
    </aside>
  );
}

export function MobileNav() {
  const nav = useNav();
  return (
    <nav className="scroll-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.to}
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            n.active ? "border-primary bg-blue-50 font-medium text-primary dark:bg-blue-500/15 dark:text-blue-300" : "border-line bg-card text-muted"
          }`}
        >
          <n.icon className="size-4" />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
