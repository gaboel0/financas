/** Feriados nacionais do Brasil (fixos + móveis pela Páscoa). Pontos facultativos marcados como tal. */
export type Holiday = { date: string; name: string; optional?: boolean };

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Domingo de Páscoa (algoritmo de Meeus/Butcher). */
function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

const cache = new Map<number, Holiday[]>();

export function brHolidays(y: number): Holiday[] {
  const hit = cache.get(y);
  if (hit) return hit;
  const e = easter(y);
  const rel = (n: number) => new Date(e.getTime() + n * 86400000).toISOString().slice(0, 10);
  const list: Holiday[] = [
    { date: iso(y, 1, 1), name: "Confraternização Universal" },
    { date: rel(-48), name: "Carnaval", optional: true },
    { date: rel(-47), name: "Carnaval", optional: true },
    { date: rel(-46), name: "Quarta de Cinzas (até 14h)", optional: true },
    { date: rel(-2), name: "Sexta-feira Santa" },
    { date: rel(0), name: "Páscoa" },
    { date: iso(y, 4, 21), name: "Tiradentes" },
    { date: iso(y, 5, 1), name: "Dia do Trabalho" },
    { date: rel(60), name: "Corpus Christi", optional: true },
    { date: iso(y, 9, 7), name: "Independência" },
    { date: iso(y, 10, 12), name: "Nossa Senhora Aparecida" },
    { date: iso(y, 11, 2), name: "Finados" },
    { date: iso(y, 11, 15), name: "Proclamação da República" },
    { date: iso(y, 11, 20), name: "Consciência Negra" },
    { date: iso(y, 12, 24), name: "Véspera de Natal", optional: true },
    { date: iso(y, 12, 25), name: "Natal" },
    { date: iso(y, 12, 31), name: "Véspera de Ano Novo", optional: true },
  ];
  list.sort((a, b) => a.date.localeCompare(b.date));
  cache.set(y, list);
  return list;
}
