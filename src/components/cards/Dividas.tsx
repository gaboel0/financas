import Link from "next/link";
import { HandCoins } from "lucide-react";
import { Card, CardHeader, Empty, Pill } from "../Card";
import { Money, Brl } from "../Money";

import { dueLabel } from "@/lib/debtDue";
import type { Debt } from "@/server/repo/debts";

export function Dividas({ open, total }: { open: Debt[]; total: number }) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={HandCoins}
        tone="rose"
        title="Dívidas"
        subtitle="O que você está devendo"
        right={<Link href="/dividas" className="text-xs font-medium text-primary hover:underline">Ver todas</Link>}
      />
      {open.length === 0 ? (
        <Empty>Nada em aberto. Anote pelo &quot;Adicionar&quot; → Dívida.</Empty>
      ) : (
        <>
          <p className="text-xs text-muted">Total em aberto</p>
          <Money cents={total} size="lg" />
          <ul className="mt-4 divide-y divide-line">
            {open.slice(0, 5).map((d) => {
              const due = dueLabel(d);
              return (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.creditor}</p>
                    {d.description ? <p className="truncate text-xs text-muted">{d.description}</p> : null}
                  </div>
                  {due ? <Pill tone={due.tone}>{due.text}</Pill> : null}
                  <span className="shrink-0 text-sm font-semibold tabular-nums"><Brl cents={d.remaining} /></span>
                </li>
              );
            })}
          </ul>
          {open.length > 5 ? <p className="mt-2 text-xs text-muted">e mais {open.length - 5}</p> : null}
        </>
      )}
    </Card>
  );
}
