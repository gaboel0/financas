import "server-only";
import { all, get } from "../db";
import { daysBetween, todayISO } from "@/lib/month";

export const TRIP_CATEGORIES = [
  { key: "transporte", label: "Transporte" },
  { key: "hospedagem", label: "Hospedagem" },
  { key: "alimentacao", label: "Alimentação" },
  { key: "passeios", label: "Passeios" },
  { key: "compras", label: "Compras" },
  { key: "outros", label: "Outros" },
] as const;

export type Trip = {
  id: number; name: string; destination: string | null; start_date: string | null; end_date: string | null;
  budget: number | null; people: number; notes: string | null;
};
export type TripItem = { id: number; category: string; description: string; amount: number; date: string | null; paid: number };

type Totals = { total: number; pago: number };

/** Lista de viagens com totais: a próxima/atual primeiro, depois as futuras, depois as passadas. */
export function listTrips(): (Trip & Totals & { status: "andamento" | "futura" | "passada" | "sem data" })[] {
  const today = todayISO();
  const rows = all<Trip & Totals>(
    `SELECT t.*, COALESCE(SUM(i.amount), 0) AS total, COALESCE(SUM(CASE WHEN i.paid = 1 THEN i.amount END), 0) AS pago
     FROM trips t LEFT JOIN trip_items i ON i.trip_id = t.id GROUP BY t.id`,
  );
  const status = (t: Trip) =>
    !t.start_date ? "sem data" as const
    : t.start_date <= today && (t.end_date ?? t.start_date) >= today ? "andamento" as const
    : t.start_date > today ? "futura" as const : "passada" as const;
  const order = { andamento: 0, futura: 1, "sem data": 2, passada: 3 };
  return rows
    .map((t) => ({ ...t, status: status(t) }))
    .sort((a, b) => order[a.status] - order[b.status]
      || (a.status === "passada" ? (b.start_date ?? "").localeCompare(a.start_date ?? "") : (a.start_date ?? "").localeCompare(b.start_date ?? "")));
}

export function getTrip(id: number) {
  const trip = get<Trip>("SELECT * FROM trips WHERE id = ?", id);
  if (!trip) return null;
  const items = all<TripItem>(
    "SELECT id, category, description, amount, date, paid FROM trip_items WHERE trip_id = ? ORDER BY paid, date IS NULL, date, id", id,
  );
  const total = items.reduce((s, i) => s + i.amount, 0);
  const pago = items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const porCategoria = TRIP_CATEGORIES.map((c) => ({
    ...c,
    total: items.filter((i) => i.category === c.key).reduce((s, i) => s + i.amount, 0),
    itens: items.filter((i) => i.category === c.key),
  }));
  const dias = trip.start_date && trip.end_date ? daysBetween(trip.start_date, trip.end_date) + 1 : null;
  const today = todayISO();
  return {
    trip, items, total, pago, aPagar: total - pago, porCategoria,
    dias,
    porDia: dias && dias > 0 ? Math.round(total / dias) : null,
    porPessoa: trip.people > 1 ? Math.round(total / trip.people) : null,
    faltamDias: trip.start_date && trip.start_date > today ? daysBetween(today, trip.start_date) : null,
    sobraOrcamento: trip.budget != null ? trip.budget - total : null,
  };
}
