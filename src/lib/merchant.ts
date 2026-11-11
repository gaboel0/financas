/** Palavras de banco no começo da descrição que não dizem onde foi o gasto ("Pagamento com QR Pix POSTO X" → "POSTO X"). */
const LEADING = new Set([
  "pagamento", "pgto", "pagto", "com", "de", "do", "da", "no", "na", "pelo", "por", "via", "qr", "código", "codigo", "cod",
  "pix", "conta", "parcela", "débito", "debito", "deb", "chave", "din", "transferência", "transferencia", "enviada",
  "enviado", "recebida", "recebido", "compra", "crédito", "credito", "cartão", "cartao", "efetuado", "efetuada",
]);

function stripLeading(desc: string): string {
  const words = desc.replace(/\|/g, " ").replace(/\s+\.\S+\s+BRA$/i, "").trim().split(/\s+/);
  let i = 0;
  while (i < words.length - 1 && LEADING.has(words[i].toLowerCase())) i++;
  return words.slice(i).join(" ");
}

/** Nome "limpo" do estabelecimento, para agrupar gastos. */
export function cleanMerchant(desc: string, maxWords = 4): string {
  const s = stripLeading(desc)
    .replace(/\b(institui[cç][aã]o de pagamentos?|ltda|s\.?a\.?|me|eireli|institui[cç][aã]o|tecnologia|br)\b\.?/gi, " ")
    .replace(/\*|\b\d{4,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = (s || desc).split(" ").slice(0, maxWords).join(" ");
  // Caixa alta vira "Título" para ler melhor
  return words === words.toUpperCase() ? words.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : words;
}

/** Trecho literal da descrição (sem prefixo de banco), para regra por texto: tem que aparecer igual no extrato. */
export function merchantPattern(desc: string, maxWords = 3): string {
  const s = stripLeading(desc);
  return (s || desc).split(/\s+/).slice(0, maxWords).join(" ");
}
