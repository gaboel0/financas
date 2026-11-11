import "server-only";
import { all } from "../db";
import { addDays, todayISO } from "@/lib/month";

/**
 * Empréstimos de todos os bancos, deduzidos do extrato (o MeuPluggy não manda os contratos).
 * Entrada (valor > 0) = dinheiro recebido do empréstimo; saída = parcela/pagamento.
 * Parcelas "k/n" no extrato permitem estimar o que falta.
 */
/** Só empréstimo de verdade: nada de cartão (parcelamento de fatura, limite convertido, parcelamento de compras, renegociação). */
const LOAN = /empr[eé]stimo|consignado|dinheiro (extra|express)/i;
const NOT_LOAN = /seguro|compras|fatura|limite convertido|renegocia/i;

export type Emprestimo = {
  bank: string;
  /** do ciclo em aberto: desde o primeiro crédito depois da última vez que zerou */
  recebido: number;
  pago: number;
  /** recebido − pago no ciclo (estimado: o extrato não mostra os juros) */
  saldo: number;
  desde: string | null;
  ultimoPagamento: string | null;
  /** média das 2 últimas parcelas */
  parcela: number | null;
};

const QUITADO = /quitad/i;

/** Só os empréstimos em aberto: saldo estimado > 0, parcela paga nos últimos 45 dias ou crédito nos últimos 60. */
export function listEmprestimos(): { items: Emprestimo[]; saldoTotal: number; pagoTotal: number; recebidoTotal: number } {
  const rows = all<{ date: string; amount: number; description: string; bank: string | null; account: string }>(
    `SELECT t.date, t.amount, t.description, a.bank_name AS bank, a.name AS account
     FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.type = 'BANK' ORDER BY t.date, t.amount DESC`,
  ).filter((r) => LOAN.test(r.description) && !NOT_LOAN.test(r.description));

  const byBank = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.bank ?? r.account;
    byBank.set(k, [...(byBank.get(k) ?? []), r]);
  }

  const today = todayISO();
  const items: Emprestimo[] = [];
  for (const [bank, evs] of byBank) {
    let saldo = 0, recebido = 0, pago = 0;
    let desde: string | null = null;
    let lastCredit: string | null = null;
    const pagamentos: { date: string; v: number }[] = [];
    // dias em que só houve "quitado" fecham o ciclo
    const quitadoDays = new Set(
      [...new Set(evs.filter((e) => e.amount < 0).map((e) => e.date))].filter((d) =>
        evs.filter((e) => e.date === d && e.amount < 0).every((e) => QUITADO.test(e.description)),
      ),
    );
    for (const e of evs) {
      if (e.amount > 0) {
        if (saldo <= 0) { recebido = 0; pago = 0; desde = e.date; }
        saldo += e.amount;
        recebido += e.amount;
        lastCredit = e.date;
      } else {
        saldo += e.amount;
        pago += -e.amount;
        pagamentos.push({ date: e.date, v: -e.amount });
        if (saldo < 0 || quitadoDays.has(e.date)) saldo = 0;
      }
    }
    const ultimoPagamento = pagamentos.at(-1)?.date ?? null;
    const ativo = saldo > 0
      || (ultimoPagamento !== null && ultimoPagamento >= addDays(today, -45) && !quitadoDays.has(ultimoPagamento))
      || (lastCredit !== null && lastCredit >= addDays(today, -60));
    if (!ativo) continue;
    const ult = pagamentos.slice(-2);
    items.push({
      bank, recebido, pago, saldo, desde, ultimoPagamento,
      parcela: ult.length ? Math.round(ult.reduce((s, p) => s + p.v, 0) / ult.length) : null,
    });
  }
  items.sort((a, b) => b.saldo - a.saldo || b.pago - a.pago);
  return {
    items,
    saldoTotal: items.reduce((s, x) => s + x.saldo, 0),
    pagoTotal: items.reduce((s, x) => s + x.pago, 0),
    recebidoTotal: items.reduce((s, x) => s + x.recebido, 0),
  };
}
