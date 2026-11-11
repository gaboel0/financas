import "server-only";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const OK: ActionResult = { ok: true };
export const fail = (error: string): ActionResult => ({ ok: false, error });

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function int(fd: FormData, key: string): number {
  const n = parseInt(str(fd, key), 10);
  return Number.isFinite(n) ? n : 0;
}

export function refresh(): void {
  revalidatePath("/", "layout");
}

export function wrap(fn: () => ActionResult | void): ActionResult {
  try {
    const r = fn();
    refresh();
    return r ?? OK;
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}
