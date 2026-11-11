"use client";

import { useState } from "react";
import { ArrowLeftRight, HandCoins, Plus, ReceiptText, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { currentMonth, isMonth } from "@/lib/month";
import type { Account } from "@/lib/types";
import { BUCKETS } from "@/lib/types";
import { inputCls, labelCls } from "@/lib/ui";
import { addTransaction } from "@/server/actions/transacoes";
import { createBill } from "@/server/actions/contas";
import { addIncome } from "@/server/actions/renda";
import { createDebt } from "@/server/actions/dividas";
import { DebtFields } from "./DebtFields";
import { FormDialog } from "./FormDialog";
import { BillFormFields } from "./BillForm";

type Kind = "tx" | "bill" | "income" | "debt" | null;

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function AddMenu({
  accounts,
}: {
  accounts: Pick<Account, "id" | "name" | "bank_name" | "type">[];
}) {
  const sp = useSearchParams().get("m");
  const month = isMonth(sp) ? sp : currentMonth();
  const [kind, setKind] = useState<Kind>(null);
  const [switched, setSwitched] = useState(false);

  const items: { k: Exclude<Kind, null>; label: string; icon: typeof Plus }[] = [
    { k: "tx", label: "Transação", icon: ArrowLeftRight },
    { k: "bill", label: "Conta fixa", icon: ReceiptText },
    { k: "income", label: "Renda", icon: Wallet },
    { k: "debt", label: "Dívida", icon: HandCoins },
  ];
  // Abas no topo do modal para trocar o tipo sem fechar
  const tabs = (
    <div className="seg mb-1 [--n:4]">
      {items.map((i) => (
        <button
          key={i.k}
          type="button"
          onClick={() => { setSwitched(true); setKind(i.k); }}
          data-active={kind === i.k || undefined}
          className="inline-flex items-center justify-center gap-1 whitespace-nowrap px-1.5 py-2 text-xs font-medium"
        >
          <i.icon className="size-3.5" /> {i.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <button
        onClick={() => { setSwitched(false); setKind("tx"); }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        <Plus className="size-4" /> Adicionar
      </button>

      <FormDialog instant={switched} key="tx" open={kind === "tx"} onClose={() => setKind(null)} title="Adicionar" action={addTransaction} submitLabel="Adicionar">
        {tabs}
        <div className="seg text-sm">
          <label className="cursor-pointer px-3 py-1.5 text-center">
            <input type="radio" name="kind" value="saida" defaultChecked className="sr-only" /> Saída
          </label>
          <label className="cursor-pointer px-3 py-1.5 text-center">
            <input type="radio" name="kind" value="entrada" className="sr-only" /> Entrada
          </label>
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input name="description" required placeholder="Ex.: Mercado da semana" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Valor (R$)</label>
            <input name="amount" required inputMode="decimal" placeholder="0,00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Data</label>
            <input name="date" type="date" required defaultValue={todayLocal()} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Conta / cartão</label>
          <select name="account_id" className={inputCls}>
            {accounts.length === 0 ? <option value="">Conta manual (criada automaticamente)</option> : null}
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.bank_name ? ` - ${a.bank_name}` : ""}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Classificação</label>
          <select name="bucket" defaultValue="" className={inputCls}>
            <option value="">Automática (dia a dia)</option>
            {BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </FormDialog>

      <FormDialog instant={switched} key="bill" open={kind === "bill"} onClose={() => setKind(null)} title="Adicionar" action={createBill} submitLabel="Criar conta">
        {tabs}
        <BillFormFields month={month} />
      </FormDialog>

      <FormDialog instant={switched} key="income" open={kind === "income"} onClose={() => setKind(null)} title="Adicionar" action={addIncome} submitLabel="Adicionar">
        {tabs}
        <div>
          <label className={labelCls}>Descrição</label>
          <input name="description" required defaultValue="Salário" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Valor (R$)</label>
            <input name="amount" required inputMode="decimal" placeholder="0,00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mês (se avulsa)</label>
            <input name="month" type="month" defaultValue={month} className={inputCls} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recurring" defaultChecked className="size-4 accent-blue-600" />
          Recorrente (todo mês)
        </label>
      </FormDialog>

      <FormDialog instant={switched} key="debt" open={kind === "debt"} onClose={() => setKind(null)} title="Adicionar" action={createDebt} submitLabel="Adicionar">
        {tabs}
        <DebtFields />
      </FormDialog>
    </div>
  );
}
