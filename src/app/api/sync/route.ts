import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncAll } from "@/server/pluggy/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const itemId = new URL(req.url).searchParams.get("itemId") ?? undefined;
  // botão manual: pede dados novos aos bancos antes de puxar
  const result = await syncAll({ itemId, refresh: true });
  revalidatePath("/", "layout");
  return NextResponse.json(result);
}
