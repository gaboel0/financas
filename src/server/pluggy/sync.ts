import "server-only";
import { all, get, run, tx } from "../db";
import { getPluggyClient, hasCredentials } from "./client";
import { ensureCategory } from "./categoryMap";
import { autoMatch } from "../calc/contas";
import { detectTransfers } from "../calc/transferencias";
import { getSettings, setSetting } from "../repo/settings";
import { getViewers } from "../repo/people";
import { addDays, addMonths, currentMonth, todayISO } from "@/lib/month";
import { detectBank } from "@/lib/banks";

export type SyncResult = {
  skipped?: "no-credentials" | "running";
  ok: boolean;
  upserted: number;
  errors: string[];
  needsReconnect: string[];
};

type G = typeof globalThis & { __fcSyncRunning?: boolean };

const cents = (n: number | null | undefined) => Math.round((n ?? 0) * 100);
const isoDate = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Registra/atualiza um item (conexão) da Pluggy no banco local. */
export function saveItem(id: string, connectorName: string | null, status: string | null, execStatus: string | null, lastUpdated: string | null): void {
  run(
    `INSERT INTO pluggy_items (id, connector_name, status, execution_status, last_updated_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET connector_name = excluded.connector_name, status = excluded.status,
       execution_status = excluded.execution_status, last_updated_at = excluded.last_updated_at`,
    id, connectorName, status, execStatus, lastUpdated, new Date().toISOString(),
  );
}

/**
 * Pede à Pluggy para consultar os bancos agora (em vez de usar o que ela já tem guardado)
 * e espera terminar, até ~90s. Se a Pluggy recusar (limite de atualizações etc.), segue com o que já existe.
 */
async function refreshItems(client: ReturnType<typeof getPluggyClient>, ids: string[]): Promise<void> {
  const started: string[] = [];
  await Promise.all(ids.map(async (id) => {
    try {
      await client.updateItem(id);
      started.push(id);
    } catch (e) {
      console.warn(`[financas] atualização do item ${id} recusada:`, e instanceof Error ? e.message : e);
    }
  }));
  const pending = new Set(started);
  const deadline = Date.now() + 90_000;
  while (pending.size && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    await Promise.all([...pending].map(async (id) => {
      try {
        const it = await client.fetchItem(id);
        if (it.status !== "UPDATING") pending.delete(id);
      } catch {
        pending.delete(id);
      }
    }));
  }
}

export async function syncAll(opts: { itemId?: string; ownerPersonId?: number; refresh?: boolean } = {}): Promise<SyncResult> {
  if (!hasCredentials()) return { skipped: "no-credentials", ok: false, upserted: 0, errors: [], needsReconnect: [] };
  const g = globalThis as G;
  if (g.__fcSyncRunning) return { skipped: "running", ok: false, upserted: 0, errors: [], needsReconnect: [] };
  g.__fcSyncRunning = true;

  const runId = run("INSERT INTO sync_runs (started_at, status) VALUES (?, 'running')", new Date().toISOString()).lastId;
  const result: SyncResult = { ok: true, upserted: 0, errors: [], needsReconnect: [] };
  try {
    const client = getPluggyClient();
    const items = opts.itemId
      ? [{ id: opts.itemId }]
      : all<{ id: string }>("SELECT id FROM pluggy_items ORDER BY created_at");
    const owner = opts.ownerPersonId ?? getViewers().me.id;
    if (opts.refresh) {
      // Itens do MeuPluggy pertencem à conta MeuPluggy: a API responde 404 ao pedido de atualização
      // (eles são atualizados pela própria Pluggy / em meu.pluggy.ai). Só conexões diretas dá para forçar.
      const direct = all<{ id: string }>("SELECT id FROM pluggy_items WHERE COALESCE(connector_name, '') NOT LIKE '%MeuPluggy%'")
        .map((r) => r.id)
        .filter((id) => items.some((i) => i.id === id));
      if (direct.length) await refreshItems(client, direct);
    }

    for (const it of items) {
      try {
        result.upserted += await syncItem(client, it.id, owner, result);
      } catch (e) {
        result.ok = false;
        const msg = e instanceof Error ? e.message
          : (e && typeof e === "object" && "message" in e) ? String((e as { message: unknown }).message)
          : JSON.stringify(e);
        result.errors.push(`${it.id}: ${msg}`);
      }
    }

    detectTransfers();
    const cm = currentMonth();
    for (const m of [addMonths(cm, -2), addMonths(cm, -1), cm, addMonths(cm, 1)]) autoMatch(m);
    setSetting("last_sync_at", new Date().toISOString());
  } catch (e) {
    result.ok = false;
    result.errors.push(e instanceof Error ? e.message : String(e));
  } finally {
    g.__fcSyncRunning = false;
    run(
      "UPDATE sync_runs SET finished_at = ?, status = ?, message = ?, tx_upserted = ? WHERE id = ?",
      new Date().toISOString(), result.ok ? "ok" : "error",
      [...result.errors, ...result.needsReconnect.map((i) => `reconectar ${i}`)].join(" | ") || null,
      result.upserted, runId,
    );
  }
  return result;
}

async function syncItem(
  client: ReturnType<typeof getPluggyClient>,
  itemId: string,
  ownerId: number,
  result: SyncResult,
): Promise<number> {
  const item = await client.fetchItem(itemId);
  saveItem(item.id, item.connector?.name ?? null, item.status, item.executionStatus, isoDate(item.lastUpdatedAt));
  if (item.status === "LOGIN_ERROR" || item.status === "WAITING_USER_INPUT" || item.status === "WAITING_USER_ACTION") {
    result.needsReconnect.push(item.connector?.name ?? itemId);
    return 0;
  }
  const connectorName = item.connector?.name ?? null;
  const accounts = (await client.fetchAccounts(itemId)).results;
  // MeuPluggy: cada item é uma instituição, mas o conector se chama "MeuPluggy".
  // Deduz o banco pelo nome das contas; cartões com nome genérico ("gold") herdam o banco do item.
  const itemBank =
    detectBank(connectorName, ...accounts.map((x) => x.name), ...accounts.map((x) => x.marketingName)) ?? connectorName;
  let upserted = 0;
  const today = todayISO();
  const lastSync = getSettings().lastSyncAt?.slice(0, 10) ?? null;

  for (const a of accounts) {
    if (a.type !== "BANK" && a.type !== "CREDIT") continue;
    const cd = a.creditData;
    const existing = get<{ owner_person_id: number | null }>("SELECT owner_person_id FROM accounts WHERE pluggy_id = ?", a.id);
    run(
      `INSERT INTO accounts (id, source, pluggy_id, item_id, type, subtype, name, bank_name, number_last4, balance,
         credit_limit, available_limit, close_day, due_day, owner_person_id)
       VALUES (?, 'pluggy', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pluggy_id) DO UPDATE SET item_id = excluded.item_id, type = excluded.type, subtype = excluded.subtype,
         name = excluded.name, bank_name = excluded.bank_name, number_last4 = excluded.number_last4, balance = excluded.balance,
         credit_limit = excluded.credit_limit, available_limit = excluded.available_limit,
         close_day = COALESCE(excluded.close_day, accounts.close_day), due_day = COALESCE(excluded.due_day, accounts.due_day)`,
      a.id, a.id, itemId, a.type, a.subtype, (a.marketingName || a.name).trim(),
      detectBank(a.name, a.marketingName) ?? itemBank,
      (a.number ?? "").replace(/\D/g, "").slice(-4) || null,
      cents(a.balance),
      cd?.creditLimit != null ? cents(cd.creditLimit) : null,
      cd?.availableCreditLimit != null ? cents(cd.availableCreditLimit) : null,
      cd?.balanceCloseDate ? Number(isoDate(cd.balanceCloseDate)!.slice(8, 10)) : null,
      cd?.balanceDueDate ? Number(isoDate(cd.balanceDueDate)!.slice(8, 10)) : null,
      existing?.owner_person_id ?? ownerId,
    );
    const acc = get<{ owner_person_id: number | null; close_day: number | null; due_day: number | null }>(
      "SELECT owner_person_id, close_day, due_day FROM accounts WHERE pluggy_id = ?", a.id,
    )!;

    // janela de busca
    const lastTx = get<{ d: string | null }>("SELECT MAX(date) AS d FROM transactions WHERE account_id = ? AND pluggy_id IS NOT NULL", a.id)?.d;
    // Só usa a última transação da própria conta; conta nova puxa 12 meses
    // (last_sync_at global não serve: pode ser de antes da conta existir).
    void lastSync;
    const from = lastTx ? addDays(lastTx, -10) : addMonths(today.slice(0, 7), -12) + "-" + today.slice(8, 10);
    // GET /v2/transactions (cursor). O endpoint antigo por página responde 410.
    const fetched = await client.fetchAllTransactions(a.id, { dateFrom: from, dateTo: today });

    tx(() => {
      const now = new Date().toISOString();
      for (const t of fetched) {
        ensureCategory(t.categoryId, t.category);
        const abs = Math.abs(cents(t.amount));
        // Pluggy usa convenções diferentes entre conta e cartão: o campo `type` é a fonte de verdade.
        const amount = t.type === "DEBIT" ? -abs : abs;
        const m = t.creditCardMetadata;
        run(
          `INSERT INTO transactions (id, pluggy_id, account_id, date, description, amount, pluggy_category, pluggy_category_id,
             status, installment_number, total_installments, total_amount, card_bill_id, person_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(pluggy_id) DO UPDATE SET date = excluded.date, description = excluded.description, amount = excluded.amount,
             pluggy_category = excluded.pluggy_category, pluggy_category_id = excluded.pluggy_category_id, status = excluded.status,
             installment_number = excluded.installment_number, total_installments = excluded.total_installments,
             total_amount = excluded.total_amount, card_bill_id = excluded.card_bill_id`,
          t.id, t.id, a.id, isoDate(t.date), t.description || t.descriptionRaw || "Sem descrição", amount,
          t.category, t.categoryId, t.status ?? "POSTED",
          m?.installmentNumber ?? null, m?.totalInstallments ?? null,
          m?.totalAmount != null ? cents(m.totalAmount) : null, m?.billId ?? null, acc.owner_person_id, now,
        );
        upserted++;
      }
      // pendentes que sumiram da janela (viraram POSTED com outro id ou foram canceladas)
      const keep = new Set(fetched.map((t) => t.id));
      const pend = all<{ id: string; pluggy_id: string }>(
        "SELECT id, pluggy_id FROM transactions WHERE account_id = ? AND status = 'PENDING' AND pluggy_id IS NOT NULL AND date >= ?",
        a.id, from,
      );
      for (const p of pend) if (!keep.has(p.pluggy_id)) run("DELETE FROM transactions WHERE id = ?", p.id);
    });

    if (a.type === "CREDIT") {
      try {
        const bills = (await client.fetchCreditCardBills(a.id)).results;
        tx(() => {
          for (const b of bills) {
            const due = isoDate(b.dueDate);
            const close = isoDate(b.billClosingDate);
            const ref = close
              ? close.slice(0, 7)
              : due
                ? (acc.close_day && acc.due_day && acc.due_day <= acc.close_day ? addMonths(due.slice(0, 7), -1) : due.slice(0, 7))
                : null;
            const paidSum = (b.payments ?? []).reduce((s, p) => s + p.amount, 0);
            run(
              `INSERT INTO card_bills (id, pluggy_id, account_id, due_date, close_date, total_amount, minimum_amount, ref_month, paid)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(pluggy_id) DO UPDATE SET due_date = excluded.due_date, close_date = excluded.close_date,
                 total_amount = excluded.total_amount, minimum_amount = excluded.minimum_amount, ref_month = excluded.ref_month, paid = excluded.paid`,
              b.id, b.id, a.id, due, close, cents(b.totalAmount), b.minimumPaymentAmount != null ? cents(b.minimumPaymentAmount) : null,
              ref, b.totalAmount > 0 && paidSum >= b.totalAmount * 0.99 ? 1 : 0,
            );
          }
        });
      } catch (e) {
        result.errors.push(`faturas ${a.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return upserted;
}
