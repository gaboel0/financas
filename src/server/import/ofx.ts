import "server-only";
import { parseMoney } from "@/lib/format";

export type ParsedTx = { date: string; description: string; amount: number; fitid?: string };

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}>\\s*([^<\\r\\n]*)`, "i").exec(block);
  return m ? m[1].trim() : null;
}

/** Interpreta OFX (SGML 1.x ou XML 2.x). Valores em centavos, negativo = saída. */
export function parseOFX(text: string): ParsedTx[] {
  const out: ParsedTx[] = [];
  const re = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRNRS>|$))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const b = m[1];
    const dt = tag(b, "DTPOSTED");
    const amt = tag(b, "TRNAMT");
    if (!dt || amt === null) continue;
    const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const memo = tag(b, "MEMO");
    const name = tag(b, "NAME");
    const description = [name, memo && memo !== name ? memo : null].filter(Boolean).join(" - ") || "Sem descrição";
    out.push({ date, description: description.replace(/\s+/g, " "), amount: parseMoney(amt), fitid: tag(b, "FITID") ?? undefined });
  }
  return out;
}

export function looksLikeOFX(text: string): boolean {
  return /<OFX>|OFXHEADER/i.test(text.slice(0, 2000)) || /<STMTTRN>/i.test(text);
}
