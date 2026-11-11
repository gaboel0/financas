"use client";

import { centsToInput } from "@/lib/format";
import { inputCls, labelCls } from "@/lib/ui";
import type { Bill } from "@/lib/types";
import { ICON_OPTIONS } from "./icons";

/** Campos do formulário de conta (criar/editar). */
export function BillFormFields({ bill, month }: { bill?: Bill; month: string }) {
  return (
    <>
      {bill ? <input type="hidden" name="id" value={bill.id} /> : null}
      <input type="hidden" name="month" value={month} />
      <div>
        <label className={labelCls}>Nome</label>
        <input name="name" required defaultValue={bill?.name} placeholder="Ex.: Condomínio" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Valor esperado (R$)</label>
          <input name="amount" required inputMode="decimal" defaultValue={bill ? centsToInput(bill.amount_expected) : ""} placeholder="0,00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Dia do vencimento</label>
          <input name="due_day" type="number" min={1} max={31} required defaultValue={bill?.due_day ?? 10} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select name="scope" defaultValue={bill?.scope ?? "house"} className={inputCls}>
            <option value="house">Casa</option>
            <option value="personal">Pessoal</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <input name="category" defaultValue={bill?.category ?? ""} placeholder="Moradia, Cartão..." className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ícone</label>
          <select name="icon" defaultValue={bill?.icon ?? "receipt"} className={inputCls}>
            {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Texto para auto-vincular</label>
          <input name="match_pattern" defaultValue={bill?.match_pattern ?? ""} placeholder="ex.: ENEL" className={inputCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_housing" defaultChecked={Boolean(bill?.is_housing)} className="size-4 accent-blue-600" />
        Conta de moradia (entra no card Moradia)
      </label>
    </>
  );
}
