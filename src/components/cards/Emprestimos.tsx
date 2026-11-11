import Link from "next/link";
import { Landmark } from "lucide-react";
import { Card, CardHeader, Empty } from "../Card";
import { Brl, Money } from "../Money";
import { cardClass } from "@/lib/cardTheme";
import { formatDateBR } from "@/lib/format";
import type { Emprestimo } from "@/server/calc/emprestimos";

/** Empréstimos em aberto de todos os bancos, pelo extrato: o ciclo atual de cada um. */
export function Emprestimos({
  data,
}: {
  data: { items: Emprestimo[]; saldoTotal: number; pagoTotal: number; recebidoTotal: number };
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Landmark}
        tone="amber"
        title="Empréstimos"
        subtitle={`${data.items.length} em aberto, pelo extrato`}
        right={<Link href="/fluxo?q=Empr" className="text-xs font-medium text-primary hover:underline">Ver lançamentos</Link>}
      />
      {data.items.length === 0 ? (
        <Empty>Nenhum empréstimo em aberto.</Empty>
      ) : (
        <>
          <p className="text-xs text-muted">Saldo em aberto (estimado)</p>
          <Money cents={data.saldoTotal} size="lg" />
          <p className="mt-1 text-[11px] text-muted">Recebido menos o que já foi pago, sem os juros (o extrato não mostra o saldo do contrato).</p>
          <ul className="mt-3 divide-y divide-line">
            {data.items.map((e) => (
              <li key={e.bank} className="flex items-center gap-3 py-2.5">
                <span className={`${cardClass(null, e.bank)} h-6 w-9 shrink-0 rounded-md`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.bank}</p>
                  <p className="truncate text-[11px] text-muted">
                    {e.desde ? `desde ${formatDateBR(e.desde)} · ` : ""}recebeu <Brl cents={e.recebido} /> · pagou <Brl cents={e.pago} />
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {e.parcela ? <>parcela ~<Brl cents={e.parcela} /></> : "nenhuma parcela no extrato ainda"}
                    {e.ultimoPagamento ? ` · última em ${formatDateBR(e.ultimoPagamento)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{e.saldo > 0 ? <Brl cents={e.saldo} /> : "—"}</p>
                  <p className="text-[11px] text-muted">{e.saldo > 0 ? "em aberto" : "ainda pagando"}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
