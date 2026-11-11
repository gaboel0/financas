"use server";

import { run } from "../db";
import { parseMoney } from "@/lib/format";
import { fail, str, wrap, type ActionResult } from "./util";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATS = ["transporte", "hospedagem", "alimentacao", "passeios", "compras", "outros"];
const optDate = (v: string) => (DATE.test(v) ? v : null);

export async function saveTrip(fd: FormData): Promise<ActionResult> {
  const id = Number(str(fd, "id")) || null;
  const name = str(fd, "name");
  const start = optDate(str(fd, "start_date"));
  const end = optDate(str(fd, "end_date"));
  const budget = str(fd, "budget") ? Math.abs(parseMoney(str(fd, "budget"))) : null;
  const people = Math.max(1, Math.round(Number(str(fd, "people")) || 1));
  if (!name) return fail("Dê um nome pra viagem.");
  if (start && end && end < start) return fail("A volta está antes da ida.");
  return wrap(() => {
    const vals = [name, str(fd, "destination") || null, start, end, budget, people, str(fd, "notes") || null];
    if (id) run("UPDATE trips SET name = ?, destination = ?, start_date = ?, end_date = ?, budget = ?, people = ?, notes = ? WHERE id = ?", ...vals, id);
    else run("INSERT INTO trips (name, destination, start_date, end_date, budget, people, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ...vals, new Date().toISOString());
  });
}

export async function deleteTrip(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("DELETE FROM trip_items WHERE trip_id = ?", id);
    run("DELETE FROM trips WHERE id = ?", id);
  });
}

export async function addTripItem(fd: FormData): Promise<ActionResult> {
  const tripId = Number(str(fd, "trip_id"));
  const description = str(fd, "description");
  const amount = Math.abs(parseMoney(str(fd, "amount")));
  const category = CATS.includes(str(fd, "category")) ? str(fd, "category") : "outros";
  if (!tripId) return fail("Viagem inválida.");
  if (!description) return fail("Diga o que é o custo.");
  if (!amount) return fail("Informe um valor maior que zero.");
  return wrap(() => {
    run(
      "INSERT INTO trip_items (trip_id, category, description, amount, date, paid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      tripId, category, description, amount, optDate(str(fd, "date")), str(fd, "paid") ? 1 : 0, new Date().toISOString(),
    );
  });
}

export async function toggleTripItemPaid(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("UPDATE trip_items SET paid = 1 - paid WHERE id = ?", id);
  });
}

export async function deleteTripItem(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("DELETE FROM trip_items WHERE id = ?", id);
  });
}
