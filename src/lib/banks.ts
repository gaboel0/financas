// Identifica a instituição pelo nome da conta/cartão. Via MeuPluggy a Pluggy devolve o conector
// "MeuPluggy" para todos os bancos, então o nome real precisa ser deduzido.
const BANKS: [RegExp, string][] = [
  [/santander/i, "Santander"],
  [/caixa|cef\b/i, "Caixa"],
  [/nubank|nu pagamentos|\bnu\b/i, "Nubank"],
  [/picpay|pic pay/i, "PicPay"],
  [/mercado ?pago/i, "Mercado Pago"],
  [/ita[uú]|personnalit/i, "Itaú"],
  [/bradesco/i, "Bradesco"],
  [/banco do brasil|\bbb\b|ourocard/i, "Banco do Brasil"],
  [/\binter\b|banco inter/i, "Inter"],
  [/\bc6\b/i, "C6 Bank"],
  [/\bbtg\b/i, "BTG"],
  [/\bxp\b/i, "XP"],
  [/sicredi/i, "Sicredi"],
  [/sicoob/i, "Sicoob"],
  [/neon/i, "Neon"],
  [/pagbank|pagseguro/i, "PagBank"],
  [/will ?bank/i, "Will Bank"],
];

export function detectBank(...texts: (string | null | undefined)[]): string | null {
  for (const t of texts) {
    if (!t) continue;
    for (const [re, name] of BANKS) if (re.test(t)) return name;
  }
  return null;
}
