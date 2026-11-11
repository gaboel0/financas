"use server";

import { all, run } from "../db";
import { parseMoney } from "@/lib/format";
import { currentMonth, dueDateOf, todayISO } from "@/lib/month";
import { getViewers } from "../repo/people";
import { ensureInstances } from "../calc/contas";
import { fail, int, str, wrap, type ActionResult } from "./util";

function readBill(fd: FormData) {
  return {
    name: str(fd, "name"),
    amount: Math.abs(parseMoney(str(fd, "amount"))),
    dueDay: Math.min(31, Math.max(1, int(fd, "due_day") || 1)),
    scope: str(fd, "scope") === "personal" ? "personal" : "house",
    payer: getViewers().me.id,
    category: str(fd, "category") || null,
    icon: str(fd, "icon") || null,
    housing: fd.get("is_housing") ? 1 : 0,
    match: str(fd, "match_pattern") || null,
  };
}

export async function createBill(fd: FormData): Promise<ActionResult> {
  const b = readBill(fd);
  if (!b.name) return fail("Informe o nome da conta.");
  if (!b.amount) return fail("Informe o valor esperado.");
  return wrap(() => {
    run(
      `INSERT INTO bills (name, category, icon, amount_expected, due_day, scope, payer_person_id, is_housing, match_pattern)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      b.name, b.category, b.icon, b.amount, b.dueDay, b.scope, b.payer, b.housing, b.match,
    );
    ensureInstances(str(fd, "month") || currentMonth());
  });
}

export async function updateBill(fd: FormData): Promise<ActionResult> {
  const id = int(fd, "id");
  const b = readBill(fd);
  if (!id || !b.name || !b.amount) return fail("Preencha nome e valor.");
  return wrap(() => {
    run(
      `UPDATE bills SET name = ?, category = ?, icon = ?, amount_expected = ?, due_day = ?, scope = ?, payer_person_id = ?,
         is_housing = ?, match_pattern = ? WHERE id = ?`,
      b.name, b.category, b.icon, b.amount, b.dueDay, b.scope, b.payer, b.housing, b.match, id,
    );
    // atualiza as instâncias ainda não pagas do mês visto em diante
    const month = str(fd, "month") || currentMonth();
    const insts = all<{ id: number; month: string }>(
      "SELECT id, month FROM bill_instances WHERE bill_id = ? AND paid = 0 AND month >= ?", id, month,
    );
    for (const i of insts) {
      run("UPDATE bill_instances SET amount = ?, due_date = ? WHERE id = ?", b.amount, dueDateOf(i.month, b.dueDay), i.id);
    }
  });
}

export async function deleteBill(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("UPDATE transactions SET bill_instance_id = NULL WHERE bill_instance_id IN (SELECT id FROM bill_instances WHERE bill_id = ?)", id);
    run("DELETE FROM bills WHERE id = ?", id);
  });
}

/** Valor real de uma conta em um mês específico. */
export async function setInstanceAmount(instanceId: number, amountText: string): Promise<ActionResult> {
  const v = Math.abs(parseMoney(amountText));
  if (!v) return fail("Valor inválido.");
  return wrap(() => {
    run("UPDATE bill_instances SET amount = ? WHERE id = ?", v, instanceId);
  });
}

export async function togglePaid(instanceId: number, paid: boolean): Promise<ActionResult> {
  return wrap(() => {
    if (paid) {
      run("UPDATE bill_instances SET paid = 1, paid_at = ? WHERE id = ?", todayISO(), instanceId);
    } else {
      run("UPDATE transactions SET bill_instance_id = NULL WHERE bill_instance_id = ?", instanceId);
      run("UPDATE bill_instances SET paid = 0, paid_at = NULL, transaction_id = NULL WHERE id = ?", instanceId);
    }
  });
}

export async function setInstanceAmountForm(fd: FormData): Promise<ActionResult> {
  return setInstanceAmount(int(fd, "id"), str(fd, "amount"));
}
