import { Suspense } from "react";
import { cookies } from "next/headers";
import { SidebarToggle } from "@/components/SidebarToggle";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { PeriodToggle } from "@/components/PeriodToggle";
import { DataTransition } from "@/components/DataTransition";
import Link from "next/link";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { MonthNav } from "@/components/MonthNav";
import { Bell } from "@/components/Bell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AddMenu } from "@/components/AddMenu";
import { getSettings } from "@/server/repo/settings";
import { getViewers } from "@/server/repo/people";
import { listAccounts } from "@/server/repo/accounts";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const sidebarOpen = jar.get("sidebar")?.value !== "closed";
  const privacyOn = jar.get("privacy")?.value === "on";
  const { me } = getViewers();
  const settings = getSettings();
  const accounts = listAccounts().map((a) => ({ id: a.id, name: a.name, bank_name: a.bank_name, type: a.type }));

  return (
    <div id="app-shell" data-sidebar={sidebarOpen ? "open" : "closed"} className="group/shell flex min-h-screen">
      {/* Coluna da sidebar: anima a largura, então o conteúdo é empurrado ao abrir e ocupa tudo ao fechar */}
      <div className="hidden w-[16.75rem] shrink-0 overflow-x-clip transition-[width] duration-300 ease-out group-data-[sidebar=closed]/shell:w-[5.25rem] lg:block">
        <Suspense fallback={<aside className="sticky top-3 ml-3 mt-3 h-[calc(100vh-1.5rem)] w-64 rounded-2xl bg-card" />}>
          <Sidebar name={me.name} />
        </Suspense>
      </div>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 bg-page/85 px-4 py-3 backdrop-blur lg:px-8">
          <div className="relative flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SidebarToggle initialOpen={sidebarOpen} />
              <Suspense fallback={<div className="h-9 w-72" />}>
                <MonthNav />
              </Suspense>
            </div>
            {/* Mês / Geral centralizado na barra (só na Visão geral) */}
            <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
              <Suspense fallback={null}>
                <PeriodToggle />
              </Suspense>
            </div>
            <div className="flex items-center gap-2">
              <PrivacyToggle initial={privacyOn} />
              <Bell />
              <ThemeToggle initial={settings.theme} />
              <Suspense fallback={null}>
                <AddMenu accounts={accounts} />
              </Suspense>
            </div>
          </div>
          <div className="mt-3 w-full lg:hidden">
            <Suspense fallback={null}>
              <MobileNav />
            </Suspense>
          </div>
        </header>
        {settings.demoMode ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 lg:px-8">
            Você está vendo dados de demonstração.{" "}
            <Link href="/conexoes" className="font-semibold underline underline-offset-2">Conecte seus bancos ou limpe o demo em Conexões</Link>.
          </div>
        ) : null}
        <main className="w-full px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        <Suspense fallback={null}>
          <DataTransition />
        </Suspense>
      </div>
    </div>
  );
}
