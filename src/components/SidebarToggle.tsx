"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

/** Abre/fecha a sidebar: troca o data-sidebar do #app-shell (o CSS anima) e guarda num cookie para o servidor já renderizar certo. */
export function SidebarToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  return (
    <button
      type="button"
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      title={open ? "Fechar menu" : "Abrir menu"}
      onClick={() => {
        const next = !open;
        setOpen(next);
        document.getElementById("app-shell")?.setAttribute("data-sidebar", next ? "open" : "closed");
        document.cookie = `sidebar=${next ? "open" : "closed"}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="hidden size-9 items-center justify-center rounded-xl bg-card text-muted transition hover:bg-soft hover:text-ink lg:inline-flex"
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
