import { Database, KeyRound, Landmark, Plug, Tags, Trash2, Upload, User, Wand2 } from "lucide-react";
import { pageCtx, type SearchParams } from "@/server/ctx";
import { all } from "@/server/db";
import { hasCredentials } from "@/server/pluggy/client";
import { listCategoryMap } from "@/server/pluggy/categoryMap";
import { listAccounts } from "@/server/repo/accounts";
import { listRules } from "@/server/repo/rules";
import { deleteRule } from "@/server/actions/regras";
import { BUCKETS } from "@/lib/types";
import { catLabel } from "@/lib/categories";
import { clearDemo, saveName, seedDemo } from "@/server/actions/settings";
import { Card, CardHeader, Empty, PageHeader, Pill } from "@/components/Card";
import { PluggyConnectButton } from "@/components/PluggyConnectButton";
import { RemoveItemButton, SyncButton } from "@/components/ConnectionActions";
import { ImportForm } from "@/components/ImportForm";
import { ActionButton } from "@/components/ActionButton";
import { CategoryBucketSelect } from "@/components/BucketSelect";
import { InlineForm } from "@/components/InlineForm";
import { formatDateBR } from "@/lib/format";
import { btnDanger, btnGhost, inputCls, labelCls } from "@/lib/ui";

type Item = { id: string; connector_name: string | null; status: string | null; execution_status: string | null; last_updated_at: string | null };
type Run = { id: number; started_at: string; finished_at: string | null; status: string | null; message: string | null; tx_upserted: number };

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "rose" | "slate" }> = {
  UPDATED: { label: "Atualizada", tone: "green" },
  UPDATING: { label: "Atualizando", tone: "amber" },
  LOGIN_ERROR: { label: "Precisa reconectar", tone: "rose" },
  WAITING_USER_INPUT: { label: "Aguardando você", tone: "amber" },
  WAITING_USER_ACTION: { label: "Aguardando você", tone: "amber" },
  OUTDATED: { label: "Desatualizada", tone: "amber" },
  PARTIAL_SUCCESS: { label: "Parcial", tone: "amber" },
};

function when(iso: string | null): string {
  if (!iso) return "nunca";
  const d = new Date(iso);
  return `${formatDateBR(iso)} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`;
}

export default async function Conexoes({ searchParams }: { searchParams: SearchParams }) {
  const { settings, me } = await pageCtx(searchParams);
  const configured = hasCredentials();
  const items = all<Item>("SELECT * FROM pluggy_items ORDER BY created_at");
  const runs = all<Run>("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 5");
  const accounts = listAccounts();
  const cats = listCategoryMap();
  const rules = listRules();

  return (
    <>
      <PageHeader title="Conexões" subtitle="Bancos via Pluggy (Open Finance), importação de extratos e dados do app." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={Plug}
            tone="blue"
            title="Bancos conectados (Pluggy)"
            subtitle={configured ? `Última sincronização: ${when(settings.lastSyncAt)} · automática a cada 6 horas` : "Credenciais ainda não configuradas"}
            right={
              configured ? (
                <div className="flex flex-wrap items-start gap-2">
                  <SyncButton label="Sincronizar tudo" />
                  <PluggyConnectButton>Conectar banco</PluggyConnectButton>
                </div>
              ) : undefined
            }
          />
          {!configured ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"><KeyRound className="size-5" /></span>
                <div className="text-sm">
                  <p className="text-base font-semibold text-amber-900 dark:text-amber-100">Configure suas credenciais da Pluggy</p>
                  <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
                    Sem credenciais o app funciona com dados manuais e importação OFX/CSV. Para puxar seus bancos automaticamente:
                  </p>
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-amber-900/90 dark:text-amber-100/90">
                    <li>Crie uma conta em <span className="font-medium">dashboard.pluggy.ai</span> e crie uma aplicação.</li>
                    <li>Copie o <span className="font-medium">Client ID</span> e o <span className="font-medium">Client Secret</span>.</li>
                    <li>Crie o arquivo <code className="rounded bg-amber-100 px-1.5 py-0.5 dark:bg-amber-500/20">.env.local</code> na raiz do projeto (veja <code className="rounded bg-amber-100 px-1.5 py-0.5 dark:bg-amber-500/20">.env.example</code>):</li>
                  </ol>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-900 p-3 text-xs text-neutral-100">{`PLUGGY_CLIENT_ID=seu-client-id
PLUGGY_CLIENT_SECRET=seu-client-secret`}</pre>
                  <p className="mt-3 text-amber-900/90 dark:text-amber-100/90">
                    Reinicie o <code className="rounded bg-amber-100 px-1.5 py-0.5 dark:bg-amber-500/20">npm run dev</code> e volte aqui. Conecte pelo conector <span className="font-medium">MeuPluggy</span> para trazer seus bancos reais via Open Finance.
                  </p>
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (
            <Empty>Nenhum banco conectado ainda. Clique em &quot;Conectar banco&quot; e escolha o conector MeuPluggy.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((it) => {
                const st = STATUS[it.status ?? ""] ?? { label: it.status ?? "Desconhecido", tone: "slate" as const };
                const itemAccounts = accounts.filter((a) => a.item_id === it.id);
                // Via MeuPluggy o conector é sempre "MeuPluggy": mostra o banco deduzido das contas
                const label = itemAccounts.find((a) => a.bank_name && a.bank_name !== it.connector_name)?.bank_name
                  ?? it.connector_name ?? "Conexão";
                const accNames = itemAccounts.map((a) => a.name.trim()).join(", ");
                return (
                  <li key={it.id} className="flex flex-wrap items-center gap-3 py-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Landmark className="size-5" /></span>
                    <div className="min-w-40 flex-1">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-muted" title={accNames}>{itemAccounts.length} {itemAccounts.length === 1 ? "conta" : "contas"} · atualizada em {when(it.last_updated_at)}</p>
                    </div>
                    <Pill tone={st.tone}>{st.label}</Pill>
                    <SyncButton itemId={it.id} />
                    {it.status === "LOGIN_ERROR" || it.status === "WAITING_USER_INPUT" || it.status === "WAITING_USER_ACTION" ? (
                      <PluggyConnectButton itemId={it.id} className={btnGhost}>Reconectar</PluggyConnectButton>
                    ) : null}
                    <RemoveItemButton itemId={it.id} name={label} />
                  </li>
                );
              })}
            </ul>
          )}
          {runs.length > 0 ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-xs font-medium text-muted">Últimas sincronizações</p>
              <ul className="space-y-1.5 text-xs text-muted">
                {runs.map((r) => (
                  <li key={r.id} className="flex flex-wrap gap-x-3">
                    <span className="tabular-nums">{when(r.started_at)}</span>
                    <Pill tone={r.status === "ok" ? "green" : r.status === "running" ? "amber" : "rose"}>{r.status}</Pill>
                    <span>{r.tx_upserted} transações</span>
                    {r.message ? <span className="truncate">{r.message}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader icon={Upload} tone="green" title="Importar extrato ou fatura" subtitle="Alternativa à Pluggy: arquivos OFX ou CSV do seu banco" />
          <ImportForm accounts={accounts.map((a) => ({ id: a.id, name: a.name, bank_name: a.bank_name }))} />
          <p className="mt-4 text-xs text-muted">
            Duplicados são ignorados pelo conteúdo do lançamento, então reimportar o mesmo arquivo é seguro. No CSV, use cabeçalhos como data, descrição e valor.
          </p>
        </Card>

        <Card>
          <CardHeader icon={Database} tone="amber" title="Dados do app" subtitle={settings.demoMode ? "Modo demonstração ativo" : "Dados próprios"} />
          <div className="space-y-3 text-sm">
            <p className="text-muted">
              O demo traz salários, contas, cartões, transações e metas de exemplo para você explorar. Recriar apaga todos os dados manuais atuais.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton action={seedDemo} confirm="Recriar o demo? Os dados manuais atuais serão substituídos." className={btnGhost}>Recriar dados de demonstração</ActionButton>
              <ActionButton action={clearDemo} confirm="Limpar contas, rendas, metas e transações manuais? Conexões Pluggy e importações são mantidas." className={btnDanger}>Limpar dados manuais/demo</ActionButton>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader icon={User} tone="violet" title="Seu nome" subtitle="Exibido no app" />
          <InlineForm action={saveName}>
            <label className={labelCls}>Nome</label>
            <input name="name" defaultValue={me.name} required className={inputCls} />
          </InlineForm>
        </Card>

        <Card>
          <CardHeader icon={Landmark} tone="slate" title="Contas e cartões" subtitle={`${accounts.length} cadastrados`} />
          {accounts.length === 0 ? <Empty>Nenhuma conta ainda.</Empty> : (
            <ul className="divide-y divide-line text-sm">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span><span className="font-medium">{a.name}</span> <span className="text-muted">· {a.bank_name ?? "-"}{a.number_last4 ? ` ••${a.number_last4}` : ""}</span></span>
                  <span className="flex gap-2">
                    <Pill tone={a.type === "CREDIT" ? "amber" : "blue"}>{a.type === "CREDIT" ? "cartão" : "conta"}</Pill>
                    <Pill>{a.source === "pluggy" ? "Pluggy" : a.source === "import" ? "importada" : "manual"}</Pill>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={Wand2} tone="violet" title="Regras" subtitle="Texto na descrição → classificação/categoria. Crie pelo ícone de varinha em Fluxo de caixa." />
          {rules.length === 0 ? <Empty>Nenhuma regra ainda. Em Fluxo de caixa, clique na varinha ao lado de uma transação.</Empty> : (
            <ul className="divide-y divide-line text-sm">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="font-medium">&quot;{r.pattern}&quot;</span>
                  <span className="text-muted">→</span>
                  {r.bucket ? <Pill tone="blue">{BUCKETS.find((b) => b.value === r.bucket)?.label ?? r.bucket}</Pill> : null}
                  {r.category ? <Pill tone="slate">{r.category}</Pill> : null}
                  <span className="ml-auto text-xs text-muted">{r.matches} {r.matches === 1 ? "transação" : "transações"}</span>
                  <ActionButton action={deleteRule.bind(null, r.id)} confirm={`Apagar a regra "${r.pattern}"?`} title="Apagar regra" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-rose-600">
                    <Trash2 className="size-4" />
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={Tags} tone="orange" title="Categorias do banco" subtitle="Defina como cada categoria entra no orçamento (dia a dia, pessoal, casa, renda ou ignorar)" />
          {cats.length === 0 ? <Empty>As categorias aparecem aqui depois da primeira sincronização ou do demo.</Empty> : (
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {cats.map((c) => (
                <li key={c.pluggy_category_id} className="flex items-center justify-between gap-3 py-1 text-sm">
                  <span className="truncate">{catLabel(c.name ?? c.pluggy_category_id)}</span>
                  <CategoryBucketSelect categoryId={c.pluggy_category_id} bucket={c.bucket} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
