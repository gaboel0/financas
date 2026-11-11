"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload } from "lucide-react";
import { btnPrimary, inputCls, labelCls } from "@/lib/ui";

export function ImportForm({ accounts }: { accounts: { id: string; name: string; bank_name: string | null }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setMsg(null);
        try {
          const r = await fetch("/api/import", { method: "POST", body: new FormData(form) });
          const j = (await r.json()) as { error?: string; inserted?: number; duplicates?: number; format?: string };
          if (!r.ok) setMsg({ ok: false, text: j.error ?? "Falha na importação." });
          else {
            setMsg({ ok: true, text: `Importado (${j.format?.toUpperCase()}): ${j.inserted} novas, ${j.duplicates} já existiam.` });
            form.reset();
            router.refresh();
          }
        } catch {
          setMsg({ ok: false, text: "Não consegui enviar o arquivo." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className={labelCls}>Conta ou cartão de destino</label>
        <select name="accountId" required className={inputCls} defaultValue="">
          <option value="" disabled>Escolha...</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.bank_name ? ` - ${a.bank_name}` : ""}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Arquivo OFX ou CSV</label>
        <input name="file" type="file" required accept=".ofx,.csv,.txt" className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-soft file:px-3 file:py-1 file:text-sm`} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimary} disabled={busy || accounts.length === 0}><Upload className="size-4" /> {busy ? "Importando..." : "Importar"}</button>
        {accounts.length === 0 ? <span className="text-sm text-muted">Crie uma transação manual antes para gerar uma conta de destino.</span> : null}
        {msg ? <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
