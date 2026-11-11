import type { ReactNode } from "react";
import { Building2, CalendarClock, Hammer, Landmark, Pencil } from "lucide-react";
import { getApartamento, getApartamentoView, emptyApartamento } from "@/server/repo/apartamento";
import { saveApartamento } from "@/server/actions/apartamento";
import { Card, CardHeader, Empty, PageHeader, Pill, Progress } from "@/components/Card";
import { Brl, Money } from "@/components/Money";
import { DialogButton } from "@/components/DialogButton";
import { centsToInput, formatDateBR, formatPct } from "@/lib/format";
import { monthLabel } from "@/lib/month";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";

export const dynamic = "force-dynamic";

function Row({ label, value, dot, strong }: { label: string; value: ReactNode; dot?: string; strong?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-muted">
        {dot ? <span className={`size-2 rounded-full ${dot}`} /> : null}
        {label}
      </span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </li>
  );
}

function EditForm() {
  const a = getApartamento() ?? emptyApartamento();
  const m = (v: number) => (v ? centsToInput(v) : "");
  const field = (name: string, label: string, value: string | number, extra: Record<string, string> = {}) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input name={name} defaultValue={value} className={inputCls} {...extra} />
    </div>
  );
  return (
    <>
      {field("nome", "Nome", a.nome)}
      {field("valorContrato", "Valor do contrato (R$)", m(a.valorContrato), { inputMode: "decimal" })}
      <p className="pt-1 text-xs font-medium text-muted">Pagamentos à construtora (entrada)</p>
      <div className="grid grid-cols-3 gap-3">
        {field("entradaPago", "Pago (R$)", m(a.entradaPago), { inputMode: "decimal" })}
        {field("entradaRestante", "Restante (R$)", m(a.entradaRestante), { inputMode: "decimal" })}
        {field("entradaAtraso", "Em atraso (R$)", m(a.entradaAtraso), { inputMode: "decimal" })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {field("parcelasPagas", "Parcelas pagas", a.parcelasPagas, { type: "number", min: "0" })}
        {field("parcelasFuturas", "Parcelas futuras", a.parcelasFuturas, { type: "number", min: "0" })}
        {field("proximaParcela", "Próxima parcela", a.proximaParcela ?? "", { type: "date" })}
      </div>
      <p className="pt-1 text-xs font-medium text-muted">Financiamento</p>
      <div className="grid grid-cols-3 gap-3">
        {field("financPago", "Pago (R$)", m(a.financPago), { inputMode: "decimal" })}
        {field("financRestante", "Restante (R$)", m(a.financRestante), { inputMode: "decimal" })}
        {field("diaVencimento", "Vence dia", a.diaVencimento ?? "", { type: "number", min: "1", max: "31" })}
      </div>
      {field("entrega", "Entrega das chaves", a.entrega ?? "", { type: "month" })}
    </>
  );
}

export default function Apartamento() {
  const v = getApartamentoView();
  const editBtn = (primary: boolean) => (
    <DialogButton
      label={primary ? <>Preencher dados</> : <><Pencil className="size-4" /> Atualizar</>}
      title="Dados do apartamento"
      action={saveApartamento}
      submitLabel="Salvar"
      className={primary ? btnPrimary : btnGhost}
    >
      <p className="text-sm text-muted">Copie os números do resumo no app da construtora ou do banco. Atualize sempre que pagar uma parcela.</p>
      <EditForm />
    </DialogButton>
  );

  if (!v) {
    return (
      <>
        <PageHeader title="Apartamento" subtitle="Acompanhe a compra do seu imóvel: entrada, obra e financiamento." />
        <Card>
          <Empty>Nenhum dado ainda.</Empty>
          <div className="mt-4">{editBtn(true)}</div>
        </Card>
      </>
    );
  }

  const entregaTxt = v.entrega ? monthLabel(v.entrega) : null;
  const faltam = v.mesesParaEntrega;

  return (
    <>
      <PageHeader
        title={v.nome}
        subtitle={entregaTxt ? `Entrega prevista em ${entregaTxt}. O financiamento começa depois da entrega.` : "Compra do imóvel: entrada, obra e financiamento."}
        right={editBtn(false)}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={Building2} tone="blue" title="Progresso da compra" subtitle={v.atualizadoEm ? `Atualizado em ${formatDateBR(v.atualizadoEm.slice(0, 10))}` : undefined} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted">Total pago</p>
              <Money cents={v.totalPago} size="xl" />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Valor do contrato</p>
              <Money cents={v.valorContrato} size="md" />
            </div>
          </div>
          <div className="mt-4"><Progress value={v.pctPago} tone="green" /></div>
          <p className="mt-2 text-xs text-muted">{formatPct(v.pctPago)} do contrato pago · falta <Brl cents={v.totalRestante} /></p>
          <div className="mt-5 flex flex-wrap gap-2">
            {v.entradaAtraso > 0 ? <Pill tone="rose">em atraso: <Brl cents={v.entradaAtraso} /></Pill> : <Pill tone="green">nada em atraso</Pill>}
            {v.parcelasFuturas > 0 ? (
              <Pill tone="amber">
                {v.parcelasFuturas} {v.parcelasFuturas === 1 ? "parcela futura" : "parcelas futuras"} da entrada
                {v.proximaParcela ? ` · próxima em ${formatDateBR(v.proximaParcela)}` : ""}
              </Pill>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader icon={CalendarClock} tone="violet" title="Entrega das chaves" subtitle={entregaTxt ?? "sem data"} />
          {faltam === null ? <Empty>Informe o mês de entrega em Atualizar.</Empty> : (
            <>
              <p className="text-4xl font-semibold tracking-tight">{faltam > 0 ? faltam : 0}</p>
              <p className="text-sm text-muted">{faltam > 0 ? (faltam === 1 ? "mês para a entrega" : "meses para a entrega") : "entrega prevista para agora"}</p>
            </>
          )}
        </Card>

        <Card>
          <CardHeader icon={Landmark} tone="amber" title="Pagamentos à construtora" subtitle="Entrada parcelada" />
          <ul className="divide-y divide-line">
            <Row label="Pago" dot="bg-emerald-500" value={<Brl cents={v.entradaPago} />} />
            <Row label="Restante" dot="bg-blue-500" value={<Brl cents={v.entradaRestante} />} />
            <Row label="Em atraso" dot="bg-rose-500" value={<Brl cents={v.entradaAtraso} />} />
            <Row label="Parcelas pagas" value={v.parcelasPagas} />
            <Row label="Parcelas futuras" value={v.parcelasFuturas} />
            {v.proximaParcela ? <Row label="Próxima parcela" value={formatDateBR(v.proximaParcela)} strong /> : null}
          </ul>
        </Card>

        <Card>
          <CardHeader icon={Building2} tone="blue" title="Financiamento" subtitle={entregaTxt ? `Começa após a entrega (${entregaTxt})` : "Começa após a entrega"} />
          <ul className="divide-y divide-line">
            <Row label="Pago" dot="bg-emerald-500" value={<Brl cents={v.financPago} />} />
            <Row label="Restante" dot="bg-blue-500" value={<Brl cents={v.financRestante} />} strong />
            {v.diaVencimento ? <Row label="Vencimento" value={`todo dia ${v.diaVencimento}`} /> : null}
          </ul>
        </Card>

        <Card>
          <CardHeader icon={Hammer} tone="orange" title="Durante a obra" subtitle="Taxa de obra (juros de evolução)" />
          {v.taxaObra ? (
            <>
              <Money cents={v.taxaObra} size="lg" />
              <p className="mt-1 text-sm text-muted">por mês, até a entrega. Está nas Recorrências, como moradia.</p>
            </>
          ) : (
            <Empty>Cadastre a taxa de obra como conta fixa de moradia (com &quot;obra&quot; no nome) para ela aparecer aqui.</Empty>
          )}
          {v.obraPagamentos.length > 0 ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-xs font-medium text-muted">Já pago de taxa de obra</p>
                <span className="text-sm font-semibold"><Brl cents={v.obraTotalPago} /></span>
              </div>
              <ul className="space-y-1.5 text-sm">
                {v.obraPagamentos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-muted" title={p.description}>
                      {formatDateBR(p.date)}{p.ref ? ` · ref. ${monthLabel(p.ref)}` : ""}
                    </span>
                    <span className="tabular-nums"><Brl cents={p.amount} /></span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-4 text-xs text-muted">Ela não abate o saldo devedor: é juros sobre o que o banco já liberou para a construtora.</p>
        </Card>
      </div>
    </>
  );
}
