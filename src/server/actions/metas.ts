"use server";

import { get, run } from "../db";
import { parseMoney } from "@/lib/format";
import { todayISO } from "@/lib/month";
import { fail, int, str, wrap, type ActionResult } from "./util";

function readGoal(fd: FormData) {
  const rate = str(fd, "interest_rate_monthly");
  return {
    name: str(fd, "name"),
    icon: str(fd, "icon") || (str(fd, "kind") === "projeto" ? "hammer" : "piggy-bank"),
    kind: str(fd, "kind") === "projeto" ? "projeto" : "reserva",
    target: Math.abs(parseMoney(str(fd, "target_amount"))),
    monthly: Math.abs(parseMoney(str(fd, "monthly_contribution"))),
    rate: rate === "" ? null : Number(rate.replace(",", ".")),
    notes: str(fd, "notes") || null,
  };
}

export async function createGoal(fd: FormData): Promise<ActionResult> {
  const g = readGoal(fd);
  if (!g.name) return fail("Dê um nome à meta.");
  if (!g.target) return fail("Informe o valor da meta.");
  return wrap(() => {
    run(
      `INSERT INTO goals (name, icon, kind, target_amount, monthly_contribution, interest_rate_monthly, start_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      g.name, g.icon, g.kind, g.target, g.monthly, g.rate, todayISO(), g.notes,
    );
  });
}

export async function updateGoal(fd: FormData): Promise<ActionResult> {
  const id = int(fd, "id");
  const g = readGoal(fd);
  if (!id || !g.name || !g.target) return fail("Preencha nome e meta.");
  return wrap(() => {
    run(
      `UPDATE goals SET name = ?, icon = ?, kind = ?, target_amount = ?, monthly_contribution = ?, interest_rate_monthly = ?, notes = ? WHERE id = ?`,
      g.name, g.icon, g.kind, g.target, g.monthly, g.rate, g.notes, id,
    );
  });
}

export async function deleteGoal(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("DELETE FROM goals WHERE id = ?", id);
  });
}

/** Aporte (positivo) ou retirada (negativo); o saldo é o balance_after do último lançamento. */
export async function addGoalEntry(fd: FormData): Promise<ActionResult> {
  const goalId = int(fd, "goal_id");
  const raw = parseMoney(str(fd, "amount"));
  const withdraw = str(fd, "type") === "retirada";
  const amount = withdraw ? -Math.abs(raw) : Math.abs(raw);
  const date = str(fd, "date") || todayISO();
  if (!goalId || !amount) return fail("Informe o valor.");
  return wrap(() => {
    const last = get<{ b: number | null }>(
      "SELECT balance_after AS b FROM goal_entries WHERE goal_id = ? ORDER BY date DESC, id DESC LIMIT 1", goalId,
    )?.b ?? 0;
    const interest = str(fd, "interest") ? Math.abs(parseMoney(str(fd, "interest"))) : 0;
    run(
      "INSERT INTO goal_entries (goal_id, date, amount, balance_after) VALUES (?, ?, ?, ?)",
      goalId, date, amount, last + amount + interest,
    );
  });
}

export async function deleteGoalEntry(id: number): Promise<ActionResult> {
  return wrap(() => {
    const e = get<{ goal_id: number; date: string; balance_after: number }>(
      "SELECT goal_id, date, balance_after FROM goal_entries WHERE id = ?", id,
    );
    if (!e) return;
    const prev = get<{ b: number }>(
      "SELECT balance_after AS b FROM goal_entries WHERE goal_id = ? AND (date < ? OR (date = ? AND id < ?)) ORDER BY date DESC, id DESC LIMIT 1",
      e.goal_id, e.date, e.date, id,
    )?.b ?? 0;
    const delta = e.balance_after - prev;
    run(
      "UPDATE goal_entries SET balance_after = balance_after - ? WHERE goal_id = ? AND (date > ? OR (date = ? AND id > ?))",
      delta, e.goal_id, e.date, e.date, id,
    );
    run("DELETE FROM goal_entries WHERE id = ?", id);
  });
}
