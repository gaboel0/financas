import "server-only";
import { parseMonth } from "@/lib/month";
import { getSettings } from "./repo/settings";
import { getViewers } from "./repo/people";

export type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** Contexto comum das páginas: mês (?m=YYYY-MM), usuário e configurações. */
export async function pageCtx(searchParams: SearchParams) {
  const sp = await searchParams;
  const month = parseMonth(sp.m);
  const viewers = getViewers();
  return { month, ...viewers, settings: getSettings(), sp };
}
