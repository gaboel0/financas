import "server-only";
import { get } from "../db";
import type { Person } from "@/lib/types";

/** Usuário único do app (a pessoa marcada como is_me). */
export function getViewers(): { me: Person } {
  const me = get<Person>("SELECT * FROM people ORDER BY is_me DESC, id LIMIT 1");
  if (!me) throw new Error("Nenhuma pessoa cadastrada.");
  return { me };
}
