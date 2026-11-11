"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { btnGhost, btnPrimary } from "@/lib/ui";

export function SyncButton({ itemId, label = "Sincronizar", primary = false }: { itemId?: string; label?: string; primary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        className={primary ? btnPrimary : btnGhost}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const r = await fetch(`/api/sync${itemId ? `?itemId=${encodeURIComponent(itemId)}` : ""}`, { method: "POST" });
            const j = (await r.json()) as { skipped?: string; ok: boolean; upserted: number; errors: string[]; needsReconnect: string[] };
            if (j.skipped === "no-credentials") setMsg("Configure suas credenciais da Pluggy primeiro.");
            else if (j.skipped === "running") setMsg("Já existe uma sincronização em andamento.");
            else if (j.needsReconnect.length) setMsg(`Reconecte: ${j.needsReconnect.join(", ")}.`);
            else if (!j.ok) setMsg(j.errors[0] ?? "A sincronização terminou com erros.");
            else setMsg(`${j.upserted} transações atualizadas.`);
            router.refresh();
          } catch {
            setMsg("Falha ao sincronizar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> {busy ? "Sincronizando..." : label}
      </button>
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
    </span>
  );
}

export function RemoveItemButton({ itemId, name }: { itemId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      title="Remover conexão"
      className="rounded-lg p-2 text-muted hover:bg-soft hover:text-rose-600"
      onClick={async () => {
        if (!window.confirm(`Remover a conexão com ${name}? As contas e transações sincronizadas dela serão apagadas daqui.`)) return;
        setBusy(true);
        await fetch(`/api/pluggy/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
        router.refresh();
        setBusy(false);
      }}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
