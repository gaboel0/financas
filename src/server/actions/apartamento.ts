"use server";

import { parseMoney } from "@/lib/format";
import { getApartamento, emptyApartamento } from "../repo/apartamento";
import { setSetting } from "../repo/settings";
import { fail, int, str, wrap, type ActionResult } from "./util";

/** Salva o resumo do apartamento (copiado do app da construtora/banco). */
export async function saveApartamento(fd: FormData): Promise<ActionResult> {
  const money = (k: string) => Math.abs(parseMoney(str(fd, k)));
  const entrega = str(fd, "entrega");
  if (entrega && !/^\d{4}-\d{2}$/.test(entrega)) return fail("Mês de entrega inválido.");
  const dia = int(fd, "diaVencimento");
  const proxima = str(fd, "proximaParcela");
  if (proxima && !/^\d{4}-\d{2}-\d{2}$/.test(proxima)) return fail("Data da próxima parcela inválida.");
  return wrap(() => {
    const cur = getApartamento() ?? emptyApartamento();
    const next = {
      ...cur,
      nome: str(fd, "nome") || "Apartamento",
      valorContrato: money("valorContrato"),
      entradaPago: money("entradaPago"),
      entradaRestante: money("entradaRestante"),
      entradaAtraso: money("entradaAtraso"),
      parcelasPagas: Math.max(0, int(fd, "parcelasPagas")),
      parcelasFuturas: Math.max(0, int(fd, "parcelasFuturas")),
      proximaParcela: proxima || null,
      diaVencimento: dia >= 1 && dia <= 31 ? dia : null,
      financPago: money("financPago"),
      financRestante: money("financRestante"),
      entrega: entrega || null,
      atualizadoEm: new Date().toISOString(),
    };
    setSetting("apartamento", JSON.stringify(next));
  });
}
