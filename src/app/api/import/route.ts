import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { decodeFile, importText } from "@/server/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const accountId = String(form.get("accountId") ?? "");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Escolha um arquivo OFX ou CSV." }, { status: 400 });
    if (!accountId) return NextResponse.json({ error: "Escolha a conta de destino." }, { status: 400 });
    const text = decodeFile(await file.arrayBuffer());
    const result = importText(text, file.name, accountId);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha na importação." }, { status: 400 });
  }
}
