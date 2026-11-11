"use server";

import { get, run, tx } from "../db";
import { parseMoney } from "@/lib/format";
import { todayISO } from "@/lib/month";
import { fail, str, wrap, type ActionResult } from "./util";

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Marca/desmarca como quitada conforme o que já foi pago. */
function syncSettled(id: number): void {
  const d = get<{ amount: number; paid: number; settled_at: string | null }>(
    "SELECT amount, settled_at, COALESCE((SELECT SUM(amount) FROM debt_payments WHERE debt_id = debts.id), 0) AS paid FROM debts WHERE id = ?",
    id,
  );
  if (!d) return;
  if (d.paid >= d.amount && !d.settled_at) run("UPDATE debts SET settled_at = ? WHERE id = ?", new Date().toISOString(), id);
  if (d.paid < d.amount && d.settled_at) run("UPDATE debts SET settled_at = NULL WHERE id = ?", id);
}

function readDebt(fd: FormData): { creditor: string; description: string | null; amount: number; due: string | null; notes: string | null } | string {
  const creditor = str(fd, "creditor");
  const amount = Math.abs(parseMoney(str(fd, "amount")));
  const due = str(fd, "due_date");
  if (!creditor) return "Informe pra quem você deve.";
  if (!amount) return "Informe um valor maior que zero.";
  if (due && !isDate(due)) return "Data de vencimento inválida.";
  return { creditor, description: str(fd, "description") || null, amount, due: due || null, notes: str(fd, "notes") || null };
}

export async function createDebt(fd: FormData): Promise<ActionResult> {
  const d = readDebt(fd);
  if (typeof d === "string") return fail(d);
  return wrap(() => {
    run(
      "INSERT INTO debts (creditor, description, amount, due_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      d.creditor, d.description, d.amount, d.due, d.notes, new Date().toISOString(),
    );
  });
}

export async function updateDebt(fd: FormData): Promise<ActionResult> {
  const id = Number(str(fd, "id"));
  const d = readDebt(fd);
  if (typeof d === "string") return fail(d);
  return wrap(() => {
    run(
      "UPDATE debts SET creditor = ?, description = ?, amount = ?, due_date = ?, notes = ? WHERE id = ?",
      d.creditor, d.description, d.amount, d.due, d.notes, id,
    );
    syncSettled(id);
  });
}

/** Registra um pagamento. Valor em branco = paga tudo o que falta. */
export async function payDebt(fd: FormData): Promise<ActionResult> {
  const id = Number(str(fd, "id"));
  const date = str(fd, "date") || todayISO();
  if (!isDate(date)) return fail("Data inválida.");
  const d = get<{ amount: number; paid: number }>(
    "SELECT amount, COALESCE((SELECT SUM(amount) FROM debt_payments WHERE debt_id = debts.id), 0) AS paid FROM debts WHERE id = ?",
    id,
  );
  if (!d) return fail("Dívida não encontrada.");
  const remaining = Math.max(d.amount - d.paid, 0);
  const typed = str(fd, "amount");
  const value = typed ? Math.abs(parseMoney(typed)) : remaining;
  if (!value) return fail("Informe um valor maior que zero.");
  if (value > remaining) return fail(`Falta só ${(remaining / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  return wrap(() => {
    tx(() => {
      run("INSERT INTO debt_payments (debt_id, date, amount) VALUES (?, ?, ?)", id, date, value);
      syncSettled(id);
    });
  });
}

export async function deleteDebtPayment(paymentId: number): Promise<ActionResult> {
  return wrap(() => {
    const p = get<{ debt_id: number }>("SELECT debt_id FROM debt_payments WHERE id = ?", paymentId);
    if (!p) return;
    run("DELETE FROM debt_payments WHERE id = ?", paymentId);
    syncSettled(p.debt_id);
  });
}

export async function deleteDebt(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("DELETE FROM debts WHERE id = ?", id);
  });
}
