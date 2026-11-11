import "server-only";
import { createHash } from "node:crypto";
import { get, run, tx } from "../db";
import { getAccount } from "../repo/accounts";
import { guessBucket } from "../pluggy/categoryMap";
import { autoMatch } from "../calc/contas";
import { detectTransfers } from "../calc/transferencias";
import { looksLikeOFX, parseOFX } from "./ofx";
import { parseCSV } from "./csv";

export function decodeFile(buf: ArrayBuffer): string {
  const head = new TextDecoder("latin1").decode(buf.slice(0, 600));
  if (/CHARSET:\s*1252|ENCODING:\s*USASCII/i.test(head)) return new TextDecoder("windows-1252").decode(buf);
  const utf8 = new TextDecoder("utf-8").decode(buf);
  // se houver caracteres de substituição, provavelmente é latin1
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

export type ImportResult = { format: "ofx" | "csv"; total: number; inserted: number; duplicates: number };

export function importText(text: string, filename: string, accountId: string): ImportResult {
  const account = getAccount(accountId);
  if (!account) throw new Error("Conta não encontrada.");
  const isOfx = /\.ofx$/i.test(filename) || looksLikeOFX(text);
  const rows = isOfx ? parseOFX(text) : parseCSV(text, { creditCard: account.type === "CREDIT" });
  if (!rows.length) throw new Error("Nenhuma transação encontrada no arquivo.");
  const now = new Date().toISOString();
  let inserted = 0;
  const seen = new Map<string, number>();
  tx(() => {
    for (const r of rows) {
      const base = [accountId, r.date, r.amount, r.description.toLowerCase(), r.fitid ?? ""].join("|");
      // lançamentos idênticos no mesmo arquivo recebem um sufixo sequencial (sem fitid)
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const hash = createHash("sha1").update(`${base}|${r.fitid ? 0 : n}`).digest("hex");
      if (get("SELECT 1 AS x FROM transactions WHERE import_hash = ?", hash)) continue;
      const g = guessBucket(r.description);
      const override = g === "ignorar" || (g === "renda" && r.amount > 0) ? g : null;
      run(
        `INSERT INTO transactions (id, import_hash, account_id, date, description, amount, bucket_override, status, person_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?)`,
        `imp_${hash.slice(0, 20)}`, hash, accountId, r.date, r.description, r.amount, override, account.owner_person_id, now,
      );
      inserted++;
    }
  });
  if (inserted) detectTransfers();
  const months = new Set(rows.map((r) => r.date.slice(0, 7)));
  for (const m of months) autoMatch(m);
  return { format: isOfx ? "ofx" : "csv", total: rows.length, inserted, duplicates: rows.length - inserted };
}
