# Finanças da Casa — plano de implementação

App local (só localhost, sem auth) de finanças pessoais, de um único usuário. UI em pt-BR, moeda BRL ("R$ 5.304,28").

## Stack (decidido)
- Next.js 15 (App Router, TS, `src/`) + Tailwind v4 + lucide-react + Recharts. `npm run dev` roda tudo.
- DB: `node:sqlite` built-in (Node 24). Arquivo `data/financas.db` (ou `DATA_DIR`), migrado no startup. Server-only.
- Banco: Pluggy Open Finance (`pluggy-sdk` no server; widget Pluggy Connect no client — tentar `react-pluggy-connect`, se peer deps conflitarem com React 19, carregar o script do CDN do Pluggy). Funciona com o conector "MeuPluggy" (uso pessoal). `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET` em `.env.local` (`.env.example` incluso). Sync: botão "Sincronizar", no startup e a cada 6h (`instrumentation.ts`). Sem credenciais o app funciona com dados manuais + demo.
- Import OFX/CSV como alternativa.
- Tema claro/escuro.

## Estrutura
```
package.json, next.config.ts, tsconfig.json, postcss.config.mjs, .env.example, .gitignore (data/, .env.local)
instrumentation.ts                      # migrate + sync no startup + setInterval 6h (guard globalThis)
data/                                   # financas.db (gitignored)
src/app/layout.tsx, globals.css         # Tailwind v4 (@import "tailwindcss"; @custom-variant dark)
src/app/(app)/layout.tsx                # Sidebar + Topbar
src/app/(app)/page.tsx                  # Visão geral
src/app/(app)/fluxo|cartoes|casa|reserva|renda|contas|conexoes/page.tsx
src/app/api/sync, api/pluggy/connect-token, api/pluggy/items, api/pluggy/items/[id], api/import, api/notifications
src/server/db.ts (import 'server-only'; DatabaseSync em globalThis), migrations.ts, seed.ts
src/server/repo/*.ts, calc/{saldo,contas,cartoes,moradia,metas}.ts
src/server/pluggy/{client,sync,categoryMap}.ts, import/{ofx,csv}.ts, actions/*.ts ('use server')
src/components/{Sidebar,Topbar,MonthNav,AddMenu,ThemeToggle,Money,Tile}.tsx
src/components/cards/{SaldoPrevisto,ContasAPagar,GastosCategoria,Cartoes,Moradia,Metas}.tsx
src/components/PluggyConnectButton.tsx
src/lib/format.ts, month.ts, types.ts
```

## Schema (dinheiro em centavos INTEGER, datas ISO TEXT, mês 'YYYY-MM'; foreign_keys=ON, WAL)
- schema_version(version)
- settings(key PK, value): theme, dia_a_dia_budget, moradia_ref(0.30), last_sync_at
- people(id, name, avatar_emoji, color, is_me) — 1 linha (o usuário). A migração v2 removeu a segunda pessoa e reatribuiu payer/owner/person_id; colunas `bills.my_share`, `*.payer_person_id` e a tabela `settlements` ficaram sem uso.
- incomes(id, person_id, description, amount, recurring, month NULL, active); income_overrides(person_id, month, amount)
- bills(id, name, category, icon, amount_expected, due_day, scope 'house'|'personal', payer_person_id, my_share REAL NULL, is_housing, active, match_pattern)
- bill_instances(id, bill_id, month, amount, due_date, paid, paid_at, transaction_id NULL, UNIQUE(bill_id, month)) — criadas lazy ao ver o mês
- settlements(...) — legado (v1), não usada desde a v2
- pluggy_items(id TEXT PK, connector_name, status, execution_status, last_updated_at, created_at)
- accounts(id PK, source 'pluggy'|'manual'|'import', pluggy_id UNIQUE NULL, item_id, type 'BANK'|'CREDIT', subtype, name, bank_name, color, number_last4, balance, credit_limit, available_limit, close_day, due_day, owner_person_id)
- transactions(id PK, pluggy_id UNIQUE NULL, import_hash UNIQUE NULL, account_id, date, description, amount (negativo = saída), pluggy_category, pluggy_category_id, bucket_override NULL, status, installment_number, total_installments, total_amount, card_bill_id NULL, bill_instance_id NULL, person_id, created_at)
- card_bills(id PK, pluggy_id UNIQUE NULL, account_id, due_date, close_date, total_amount, minimum_amount, ref_month, paid)
- category_map(pluggy_category_id PK, bucket 'dia_a_dia'|'pessoal'|'casa'|'renda'|'ignorar') — editável
- goals(id, name, icon, kind 'reserva'|'projeto', target_amount, monthly_contribution, interest_rate_monthly NULL, start_date, notes); goal_entries(id, goal_id, date, amount, balance_after)
- sync_runs(id, started_at, finished_at, status, message, tx_upserted)

## Fórmulas (mês M)
- Todas as contas contam pelo valor integral (parte = 1).
- Bucket: bucket_override ?? category_map[pluggy_category_id] ?? 'dia_a_dia'. Default: mercado/restaurante/delivery/transporte/compras/lazer/farmácia → dia_a_dia; telecom/assinaturas/educação/plano de saúde/academia → pessoal; aluguel/luz/água/gás/internet/moradia → casa; salário → renda; transferências/pagamento de cartão/investimentos → ignorar.
- **Saldo previsto** = salário − casa (Σ contas da casa) − pessoais (Σ contas pessoais) − diaADia (Σ |saídas| bucket dia_a_dia do mês, sem bill_instance_id; `max(real, budget)` se budget definido). % livre = saldo/salário. Barra segmentada: cada item + Dia a dia + Sobra (≥0); legenda: Salário, Casa, Contas pessoais, Dia a dia, Sobra.
- Auto-match: descrição LIKE match_pattern no mesmo mês e valor ±15% → liga bill_instance e marca paga. Transações ligadas a uma conta não contam em dia a dia.
- **Contas a pagar**: total Σ instâncias; "x de y pagas"; header com próximo vencimento não pago e "em N dias" (America/Sao_Paulo); chips por due_day com pontinhos; checkbox marca paga. Sino: não pagas com vencimento ≤ hoje+7 (inclui atrasadas).
- **Gastos por categoria**: saídas do mês agrupadas por categoria (bucket efetivo ≠ ignorar/renda); top 6 + "Outras", donut Recharts com lista de valor e %.
- **Cartões**: fatura aberta = balance do CREDIT (Pluggy) ou Σ transações com ref_month=M. ref_month: dia ≤ close_day → fatura do mês, senão próxima (Pluggy: preferir creditCardMetadata.billId). Limite livre = available_limit ou limite−aberto. Projeção M+1, M+2: parcelas restantes (total_amount/total_installments ou |amount|) + assinaturas recorrentes no cartão. Gráfico "Dez (aberta)", "Jan", "Fev".
- **Moradia**: itens is_housing. Σ valor vs salário próprio. Barra com marcador em moradia_ref (30%). Grid "O que entra na conta".
- **Metas/projetos**: saldo = último balance_after; progresso = saldo/meta; projeto com juros: juros estimado = saldo×taxa; meses restantes = ceil((meta−saldo)/aporte).

## Rotas / actions
Route handlers (runtime 'nodejs'): POST /api/sync (?itemId), POST /api/pluggy/connect-token (itemId opcional p/ update), POST /api/pluggy/items {itemId} salva+sincroniza, DELETE /api/pluggy/items/[id] (também deleteItem), POST /api/import (multipart + accountId; detecta OFX/CSV), GET /api/notifications.
Server actions: renda/override salário; contas CRUD + togglePaid; settings (orçamento, tema, nome); transações CRUD + setBucket; metas CRUD + addGoalEntry; seedDemo/clearDemo.
Páginas são server components chamando calc/* com `?m=YYYY-MM`.

## Sync Pluggy
1. Sem credenciais → `{skipped:'no-credentials'}` (banner na UI).
2. Lock em globalThis; linha em sync_runs.
3. Por item: fetchItem, salva status; LOGIN_ERROR/WAITING_USER_INPUT → "reconectar".
4. fetchAccounts → upsert por pluggy_id com creditData (limite, disponível, close/due day).
5. Por conta: from = (última tx ou last_sync_at) − 10 dias; primeira vez hoje − 12 meses. Paginar fetchTransactions (pageSize 500). Upsert ON CONFLICT(pluggy_id) só colunas do banco (nunca bucket_override, bill_instance_id, person_id). Remover PENDING da janela que sumiram.
6. CREDIT: fetchCreditCardBills → upsert card_bills.
7. Auto-match, last_sync_at, fecha sync_run. Transação por conta; erros por item.
Normalizar sinal de transações de cartão (Pluggy usa convenção diferente de conta corrente).

## Seed demo (quando DB vazio; constantes num bloco só)
Uma pessoa ("Você"). Salário ~R$ 28.000. Contas da casa: Aluguel 4.200 (dia 05), Apartamento Vila Olímpia 2.332,54, Cartão Inter 2.150, Condomínio 1.580, Luz 340, Internet 129,90 — moradia exceto cartão. Contas pessoais: Reserva (4.000) e Ajuda família (3.000). Cartões: um preto (limite 20k, fecha 28, vence 05, com parcelas 3/10 e 1/6) e um laranja. ~40 transações de dia a dia no mês atual. Metas: "Reserva" (meta 30k, histórico 6 meses) e "Obra" (projeto, 1,2% a.m.). Números só precisam ser plausíveis.

## Armadilhas
- node:sqlite: só em src/server/** com 'server-only'; externals do webpack `{'node:sqlite':'commonjs node:sqlite'}` e serverExternalPackages ['pluggy-sdk']; dev sem turbopack se ele não resolver node:sqlite. DB em globalThis por causa de HMR.
- OneDrive pode travar .db/-wal/.next (EPERM) → suportar DATA_DIR.
- Connect token expira (~30 min): pedir um novo a cada abertura do widget. Nunca expor o secret.
- Pagamento de fatura na conta corrente → 'ignorar' para não contar em dobro.
- instrumentation pode rodar 2x em dev → guards em globalThis.
