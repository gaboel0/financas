"use client";

import { Wand2 } from "lucide-react";
import { BUCKETS } from "@/lib/types";
import { inputCls, labelCls } from "@/lib/ui";
import { createRule } from "@/server/actions/regras";
import { DialogButton } from "./DialogButton";
import { merchantPattern } from "@/lib/merchant";
import { catLabel } from "@/lib/categories";

/** Sugestão de texto da regra: trecho da descrição sem o prefixo do banco (até 3 palavras). */
export function suggestPattern(desc: string): string {
  return merchantPattern(desc);
}

export function RuleButton({ description, categories }: { description: string; categories: string[] }) {
  return (
    <DialogButton
      title="Criar regra"
      submitLabel="Criar regra"
      action={createRule}
      className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink"
      label={<Wand2 className="size-4" aria-label="Criar regra" />}
    >
      <p className="text-sm text-muted">
        Toda transação cuja descrição <b className="text-ink">contém</b> o texto abaixo recebe esta classificação e categoria,
        inclusive as antigas e as que ainda vão chegar.
      </p>
      <div>
        <label className={labelCls}>Texto da descrição</label>
        <input name="pattern" required defaultValue={suggestPattern(description)} className={inputCls} />
        <p className="mt-1 truncate text-xs text-muted" title={description}>Original: {description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Classificação</label>
          <select name="bucket" defaultValue="" className={inputCls}>
            <option value="">Não mudar</option>
            {BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <input name="category" list="rule-categories" placeholder="Não mudar" className={inputCls} />
          <datalist id="rule-categories">
            {[...new Set(categories.map(catLabel))].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>
    </DialogButton>
  );
}
