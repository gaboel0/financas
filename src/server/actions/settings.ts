"use server";

import { cookies } from "next/headers";
import { db, run } from "../db";
import { parseMoney } from "@/lib/format";
import { getViewers } from "../repo/people";
import { getSetting, setSetting } from "../repo/settings";
import { clearDemoData, seedDemoData } from "../seed";
import { fail, str, wrap, type ActionResult } from "./util";

export async function setTheme(theme: "light" | "dark"): Promise<void> {
  setSetting("theme", theme === "dark" ? "dark" : "light");
  (await cookies()).set("theme", theme === "dark" ? "dark" : "light", { path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function saveBudget(fd: FormData): Promise<ActionResult> {
  return wrap(() => {
    setSetting("dia_a_dia_budget", Math.abs(parseMoney(str(fd, "budget"))));
    const ref = Number(str(fd, "moradia_ref").replace(",", "."));
    if (ref > 0 && ref < 100) setSetting("moradia_ref", ref / 100);
  });
}

export async function saveName(fd: FormData): Promise<ActionResult> {
  const name = str(fd, "name");
  if (!name) return fail("Informe seu nome.");
  return wrap(() => {
    run("UPDATE people SET name = ? WHERE id = ?", name, getViewers().me.id);
  });
}

/** Apaga os dados manuais/demo atuais e recria o demo. */
export async function seedDemo(): Promise<ActionResult> {
  return wrap(() => {
    seedDemoData(db());
  });
}

/** Remove os dados manuais/demo (mantém conexões Pluggy e dados importados). */
export async function clearDemo(): Promise<ActionResult> {
  return wrap(() => {
    const d = db();
    d.exec("BEGIN");
    try {
      clearDemoData(d);
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
    if (getSetting("demo_mode")) setSetting("demo_mode", null);
  });
}
