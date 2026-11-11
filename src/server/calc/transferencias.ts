import "server-only";
import { all, run, tx } from "../db";
import { getViewers } from "../repo/people";
import { findTransferPairs, makeSignals, type TransferCandidate } from "@/lib/transfers";

/**
 * Recalcula os pares de transferência entre contas próprias (idempotente).
 * Transações com classificação manual ficam de fora: a escolha do usuário sempre vence.
 */
export function detectTransfers(): number {
  const txs = all<TransferCandidate>(
    "SELECT id, account_id, date, amount, description, pluggy_category FROM transactions WHERE bucket_override IS NULL",
  );
  const banks = all<{ bank_name: string | null }>("SELECT DISTINCT bank_name FROM accounts").map((r) => r.bank_name);
  const pairs = findTransferPairs(txs, makeSignals(getViewers().me.name, banks));
  tx(() => {
    run("UPDATE transactions SET transfer_pair = NULL WHERE transfer_pair IS NOT NULL");
    for (const [a, b] of pairs) {
      run("UPDATE transactions SET transfer_pair = ? WHERE id = ?", b, a);
      run("UPDATE transactions SET transfer_pair = ? WHERE id = ?", a, b);
    }
  });
  return pairs.length;
}
