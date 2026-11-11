"use server";

import { run } from "../db";
import { fail, str, wrap, type ActionResult } from "./util";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ["ferias", "folga", "feriado", "evento"];

export async function addCalendarEvent(fd: FormData): Promise<ActionResult> {
  const kind = KINDS.includes(str(fd, "kind")) ? str(fd, "kind") : "evento";
  const start = str(fd, "start_date");
  const end = str(fd, "end_date") || start;
  if (!DATE.test(start) || !DATE.test(end)) return fail("Informe as datas.");
  if (end < start) return fail("O fim está antes do início.");
  if (kind === "evento" && !str(fd, "title")) return fail("Dê um nome pro evento.");
  return wrap(() => {
    run(
      "INSERT INTO calendar_events (kind, title, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?)",
      kind, str(fd, "title") || null, start, end, new Date().toISOString(),
    );
  });
}

export async function deleteCalendarEvent(id: number): Promise<ActionResult> {
  return wrap(() => {
    run("DELETE FROM calendar_events WHERE id = ?", id);
  });
}
