import { NextResponse } from "next/server";
import { getPluggyClient, hasCredentials } from "@/server/pluggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gera um connect token novo a cada abertura do widget (expira em ~30 min). O secret nunca sai do servidor. */
export async function POST(req: Request) {
  if (!hasCredentials()) {
    return NextResponse.json({ error: "Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.local." }, { status: 400 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { itemId?: string };
    const { accessToken } = await getPluggyClient().createConnectToken(body.itemId || undefined);
    return NextResponse.json({ accessToken });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao criar o token." }, { status: 502 });
  }
}
