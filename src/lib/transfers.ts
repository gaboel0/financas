/**
 * Detecta transferências entre contas próprias: mesmo valor com sinal oposto,
 * contas diferentes (ou a mesma, no mesmo dia, se os dois lados forem claramente internos), até 3 dias de distância, e as duas descrições com cara de transferência
 * (pelo menos uma com sinal forte: seu nome, um banco seu, "recarga", "fatura", categoria de transferência...).
 * Sem imports para poder ser testado direto no Node.
 */

export type TransferCandidate = {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  description: string;
  pluggy_category: string | null;
};

const WEAK = /\bpix\b|transf|\bted\b|\bdoc\b|dep[oó]sito|pagamento de conta|resgate|aplica|recebid|enviad|retirada|lastro/i;
/** Compra em loja ("Pagamento com QR Pix POSTO X", "Pagamento Padaria Y"): não é transferência, salvo se citar um banco seu. */
const PURCHASE = /^pagamento (?!de conta|de fatura|recebido)/i;
/** Dívidas e empréstimos são gasto de verdade, mesmo debitados de um Pix recebido. */
const NEVER = /empr[eé]stimo|d[ií]vida|parcela|juros|tarifa/i;
const STRONG =
  /recarga|valor adicionado|adicionado na conta|cr[eé]dito em conta|fatura|pagamento recebido|mesma titularidade|entre contas|saldo (?:para|da) carteira/i;
const STRONG_CATEGORY = /transfer|same person|credit card payment/i;

const BANK_WORDS: Record<string, string[]> = {
  santander: ["santander"],
  caixa: ["caixa econ", "cef "],
  nubank: ["nubank", "nu pagamentos", "nu financeira"],
  picpay: ["picpay", "pic pay"],
  "mercado pago": ["mercado pago", "mercadopago"],
  "itaú": ["itau", "itaú"],
  bradesco: ["bradesco"],
  "banco do brasil": ["banco do brasil"],
  inter: ["banco inter"],
  c6: ["c6 bank", "banco c6"],
};

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function makeSignals(ownName: string, bankNames: (string | null)[]) {
  const tokens = norm(ownName).split(/\s+/).filter((t) => t.length >= 3);
  const nameParts = tokens.length >= 2 ? [tokens[0], tokens[tokens.length - 1]] : tokens;
  const banks = new Set<string>();
  for (const b of bankNames) {
    if (!b) continue;
    const words = BANK_WORDS[b.toLowerCase()] ?? [norm(b)];
    for (const w of words) banks.add(norm(w));
  }
  const ownNamed = (d: string) => nameParts.length > 0 && nameParts.every((p) => d.includes(p));
  const ownBank = (d: string) => [...banks].some((w) => d.includes(w));
  return {
    weak: (t: TransferCandidate) => {
      const d = norm(t.description);
      if (NEVER.test(t.description)) return false;
      if (PURCHASE.test(t.description)) return ownBank(d) || ownNamed(d);
      return WEAK.test(t.description) || STRONG.test(t.description) || STRONG_CATEGORY.test(t.pluggy_category ?? "") || ownBank(d) || ownNamed(d);
    },
    strong: (t: TransferCandidate) => {
      const d = norm(t.description);
      return STRONG.test(t.description) || STRONG_CATEGORY.test(t.pluggy_category ?? "") || ownNamed(d) || ownBank(d);
    },
  };
}

function dayNum(iso: string): number {
  return Math.round(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);
}

/** Pares [saída, entrada]. Cada transação entra em no máximo um par; prefere a mais próxima no tempo. */
export function findTransferPairs(
  txs: TransferCandidate[],
  signals: ReturnType<typeof makeSignals>,
  maxDays = 3,
): [string, string][] {
  const outs = txs.filter((t) => t.amount < 0 && signals.weak(t));
  const insByAmount = new Map<number, TransferCandidate[]>();
  for (const t of txs) {
    if (t.amount <= 0 || !signals.weak(t)) continue;
    const list = insByAmount.get(t.amount) ?? [];
    list.push(t);
    insByAmount.set(t.amount, list);
  }
  const options: { out: TransferCandidate; inn: TransferCandidate; gap: number }[] = [];
  for (const o of outs) {
    for (const i of insByAmount.get(-o.amount) ?? []) {
      const gap = Math.abs(dayNum(i.date) - dayNum(o.date));
      if (gap > maxDays) continue;
      // Mesma conta só quando os dois lados são claramente movimentação interna (ex.: recarga + "retirada de saldo por lastro")
      if (i.account_id === o.account_id ? !(signals.strong(o) && signals.strong(i) && gap === 0) : !signals.strong(o) && !signals.strong(i)) continue;
      options.push({ out: o, inn: i, gap });
    }
  }
  options.sort((a, b) => a.gap - b.gap || a.out.date.localeCompare(b.out.date));
  const used = new Set<string>();
  const pairs: [string, string][] = [];
  for (const { out, inn } of options) {
    if (used.has(out.id) || used.has(inn.id)) continue;
    used.add(out.id);
    used.add(inn.id);
    pairs.push([out.id, inn.id]);
  }
  return pairs;
}
