import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { run, tx } from "@/server/db";
import { getPluggyClient, hasCredentials } from "@/server/pluggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let remote: string | null = null;
  if (hasCredentials()) {
    try {
      await getPluggyClient().deleteItem(id);
    } catch (e) {
      remote = e instanceof Error ? e.message : "falha ao remover na Pluggy";
    }
  }
  tx(() => {
    run("UPDATE bill_instances SET transaction_id = NULL WHERE transaction_id IN (SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.item_id = ?)", id);
    run("DELETE FROM accounts WHERE item_id = ? AND source = 'pluggy'", id);
    run("DELETE FROM pluggy_items WHERE id = ?", id);
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, remoteWarning: remote });
}
