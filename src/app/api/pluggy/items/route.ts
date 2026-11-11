import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPluggyClient, hasCredentials } from "@/server/pluggy/client";
import { saveItem, syncAll } from "@/server/pluggy/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Salva o item criado pelo widget e já sincroniza. */
export async function POST(req: Request) {
  if (!hasCredentials()) return NextResponse.json({ error: "Credenciais não configuradas." }, { status: 400 });
  const { itemId } = (await req.json().catch(() => ({}))) as { itemId?: string };
  if (!itemId) return NextResponse.json({ error: "itemId obrigatório." }, { status: 400 });
  try {
    const item = await getPluggyClient().fetchItem(itemId);
    saveItem(item.id, item.connector?.name ?? null, item.status, item.executionStatus, item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toISOString() : null);
    const result = await syncAll({ itemId });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, sync: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao salvar a conexão." }, { status: 502 });
  }
}
