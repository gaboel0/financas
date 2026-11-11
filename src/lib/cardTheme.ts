/** Classe CSS do cartão por banco/cor (dark = Itaú, orange = Inter, purple = Nubank...). */
export function cardClass(color: string | null | undefined, bank?: string | null): string {
  const key = (color || guess(bank)).toLowerCase();
  const known = ["dark", "orange", "purple", "blue", "red", "green", "slate"];
  return `card-${known.includes(key) ? key : "slate"}`;
}

function guess(bank?: string | null): string {
  const b = (bank ?? "").toLowerCase();
  if (/ita[uú]|c6|black|btg/.test(b)) return "dark";
  if (/inter|laranja/.test(b)) return "orange";
  if (/nubank|nu pagamentos/.test(b)) return "purple";
  if (/bradesco|santander|xp/.test(b)) return "red";
  if (/picpay|sicredi|sicoob/.test(b)) return "green";
  if (/caixa|mercado/.test(b)) return "blue";
  if (/banco do brasil|bb/.test(b)) return "blue";
  return "slate";
}
