"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Esconde/mostra todos os valores em R$ (vira R$ ****). Guarda a escolha num cookie. */
export function PrivacyToggle({ initial }: { initial: boolean }) {
  const [hidden, setHidden] = useState(initial);
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-label={hidden ? "Mostrar valores" : "Esconder valores"}
      title={hidden ? "Mostrar valores" : "Esconder valores"}
      onClick={() => {
        const next = !hidden;
        setHidden(next);
        document.documentElement.setAttribute("data-privacy", next ? "on" : "off");
        document.cookie = `privacy=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
      }}
      className={`inline-flex size-9 items-center justify-center rounded-xl transition hover:bg-soft hover:text-ink ${hidden ? "bg-primary/15 text-primary" : "bg-card text-muted"}`}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
