import "server-only";
import { all, get } from "../db";
import { currentMonth } from "@/lib/month";
import { getSetting } from "./settings";

/** Resumo do contrato do apartamento (valores em centavos), editado à mão a partir do app da construtora/banco. */
export type Apartamento = {
  nome: string;
  valorContrato: number;
  /** Pagamentos à construtora (entrada/sinal parcelado) */
  entradaPago: number;
  entradaRestante: number;
  entradaAtraso: number;
  parcelasPagas: number;
  parcelasFuturas: number;
  /** AAAA-MM-DD da próxima parcela da entrada */
  proximaParcela: string | null;
  /** dia de vencimento do contrato (financiamento) */
  diaVencimento: number | null;
  /** Financiamento (banco) — começa depois da entrega */
  financPago: number;
  financRestante: number;
  /** AAAA-MM */
  entrega: string | null;
  atualizadoEm: string | null;
};

const EMPTY: Apartamento = {
  nome: "Apartamento",
  valorContrato: 0,
  entradaPago: 0,
  entradaRestante: 0,
  entradaAtraso: 0,
  parcelasPagas: 0,
  parcelasFuturas: 0,
  proximaParcela: null,
  diaVencimento: null,
  financPago: 0,
  financRestante: 0,
  entrega: null,
  atualizadoEm: null,
};

export function getApartamento(): Apartamento | null {
  const raw = getSetting("apartamento");
  if (!raw) return null;
  try {
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Apartamento>) };
  } catch {
    return null;
  }
}

export function emptyApartamento(): Apartamento {
  return EMPTY;
}

export type ApartamentoView = Apartamento & {
  totalPago: number;
  totalRestante: number;
  pctPago: number;
  mesesParaEntrega: number | null;
  /** Taxa de obra mensal (conta fixa de moradia com "obra" no nome), se cadastrada */
  taxaObra: number | null;
  /** Pagamentos de taxa de obra achados no extrato (débito "PRESTACAO HAB" ou ligados à conta fixa da obra) */
  obraPagamentos: { id: string; date: string; amount: number; description: string; ref: string | null }[];
  obraTotalPago: number;
};

export function getApartamentoView(): ApartamentoView | null {
  const a = getApartamento();
  if (!a) return null;
  const totalPago = a.entradaPago + a.financPago;
  const totalRestante = a.entradaRestante + a.financRestante;
  let meses: number | null = null;
  if (a.entrega) {
    const [y1, m1] = currentMonth().split("-").map(Number);
    const [y2, m2] = a.entrega.split("-").map(Number);
    meses = (y2 - y1) * 12 + (m2 - m1);
  }
  const taxa = get<{ v: number }>(
    "SELECT amount_expected AS v FROM bills WHERE active = 1 AND is_housing = 1 AND lower(name) LIKE '%obra%' ORDER BY id DESC LIMIT 1",
  )?.v ?? null;
  const obraPagamentos = all<{ id: string; date: string; amount: number; description: string; ref: string | null }>(
    `SELECT t.id, t.date, -t.amount AS amount, t.description, bi.month AS ref
     FROM transactions t
     LEFT JOIN bill_instances bi ON bi.id = t.bill_instance_id
     LEFT JOIN bills b ON b.id = bi.bill_id
     WHERE t.amount < 0 AND (t.description LIKE '%PRESTACAO HAB%' OR (b.is_housing = 1 AND lower(b.name) LIKE '%obra%'))
     ORDER BY t.date DESC`,
  );
  return {
    ...a,
    obraPagamentos,
    obraTotalPago: obraPagamentos.reduce((s, p) => s + p.amount, 0),
    totalPago,
    totalRestante,
    pctPago: a.valorContrato > 0 ? Math.min(totalPago / a.valorContrato, 1) : 0,
    mesesParaEntrega: meses,
    taxaObra: taxa,
  };
}
