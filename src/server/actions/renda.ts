"use server";

import { run } from "../db";
import { getViewers } from "../repo/people";
import { parseMoney } from "@/lib/format";
import { isMonth } from "@/lib/month";
import { fail, int, str, wrap, type ActionResult } from "./util";

export async function addIncome(fd: FormData): Promise<ActionResult> {
  const personId = getViewers().me.id;
  const description = str(fd, "description") || "Renda";
  const amount = Math.abs(parseMoney(str(fd, "amount")));
  const recurring = fd.get("recurring") ? 1 : 0;
  const month = str(fd, "month");
  if (!amount) return fail("Informe o valor.");
  if (!recurring && !isMonth(month)) return fail("Informe o mês da renda avulsa.");
  return wrap(() => {
    run(
      "INSERT INTO incomes (person_id, description, amount, recurring, month) VALUES (?, ?, ?, ?, ?)",
      personId, description, amount, recurring, recurring ? null : month,
    );
  });
}

export async function updateIncome(fd: FormData): Promise<ActionResult> {
  const id = int(fd, "id");
  const amount = Math.abs(parseMoney(str(fd, "amount")));
  const description = str(fd, "description");
  if (!id || !amount || !description) return fail("Preencha descrição e valor.");
  return wrap(() => {
    run("UPDATE incomes SET description = ?, amount = ? WHERE id = ?", description, amount, id);
  });
}

export async function deleteIncome(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("DELETE FROM incomes WHERE id = ?", id);
  });
}

/** Salário diferente só neste mês (ex.: 13º, bônus, férias). Valor vazio remove o override. */
export async function setIncomeOverride(fd: FormData): Promise<ActionResult> {
  const personId = getViewers().me.id;
  const month = str(fd, "month");
  const raw = str(fd, "amount");
  if (!isMonth(month)) return fail("Dados inválidos.");
  return wrap(() => {
    if (raw === "") run("DELETE FROM income_overrides WHERE person_id = ? AND month = ?", personId, month);
    else {
      run(
        "INSERT INTO income_overrides (person_id, month, amount) VALUES (?, ?, ?) ON CONFLICT(person_id, month) DO UPDATE SET amount = excluded.amount",
        personId, month, Math.abs(parseMoney(raw)),
      );
    }
  });
}
