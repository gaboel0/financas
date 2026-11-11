"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { btnPrimary } from "@/lib/ui";

const SCRIPT_URL = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";

type PluggyConnectCtor = new (opts: {
  connectToken: string;
  includeSandbox?: boolean;
  onSuccess?: (data: { item: { id: string } }) => void;
  onError?: (e: { message?: string }) => void;
  onClose?: () => void;
}) => { init: () => void };

declare global {
  interface Window {
    PluggyConnect?: PluggyConnectCtor;
  }
}

function loadScript(): Promise<void> {
  if (window.PluggyConnect) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("Não foi possível carregar o widget da Pluggy (sem internet?).")));
    if (!existing) {
      s.src = SCRIPT_URL;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

/** Abre o widget Pluggy Connect (com um connect token novo a cada clique). `itemId` = reconectar. */
export function PluggyConnectButton({
  itemId, children, className = btnPrimary, disabled = false,
}: {
  itemId?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setMsg(null);
    try {
      const [, tokenRes] = await Promise.all([
        loadScript(),
        fetch("/api/pluggy/connect-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId }),
        }),
      ]);
      const body = (await tokenRes.json()) as { accessToken?: string; error?: string };
      if (!tokenRes.ok || !body.accessToken) throw new Error(body.error ?? "Falha ao obter o token.");
      if (!window.PluggyConnect) throw new Error("Widget da Pluggy indisponível.");
      const widget = new window.PluggyConnect({
        connectToken: body.accessToken,
        includeSandbox: false,
        onSuccess: async ({ item }) => {
          setMsg("Conectado! Sincronizando transações...");
          const r = await fetch("/api/pluggy/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ itemId: item.id }),
          });
          setMsg(r.ok ? "Pronto. Dados sincronizados." : "Conectado, mas a sincronização falhou. Tente 'Sincronizar'.");
          router.refresh();
        },
        onError: (e) => setMsg(e?.message ?? "Erro no widget da Pluggy."),
        onClose: () => setBusy(false),
      });
      widget.init();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} disabled={disabled || busy} onClick={open}>
        {busy ? "Abrindo..." : children}
      </button>
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
    </span>
  );
}
