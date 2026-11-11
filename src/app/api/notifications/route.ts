import { NextResponse } from "next/server";
import { getNotifications } from "@/server/calc/contas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = getNotifications();
  return NextResponse.json({ count: items.length, items });
}
