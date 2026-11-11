import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { addMonths, currentMonth, dueDateOf, refMonthOf, todayISO } from "@/lib/month";

/* ------------------------------------------------------------------ */
/* Constantes do demo (valores em centavos)                            */
/* ------------------------------------------------------------------ */
const DEMO = {
  salario: 2800000,
  diaADiaBudget: 700000,
  moradiaRef: 0.3,
  bills: [
    // nome, categoria, ícone, valor, dia, escopo, moradia?, padrão de match
    { name: "Aluguel", category: "Moradia", icon: "home", amount: 420000, day: 5, scope: "house", housing: 1, match: "ALUGUEL", cat: "rent" },
    { name: "Apartamento Vila Olímpia", category: "Moradia", icon: "building-2", amount: 233254, day: 8, scope: "house", housing: 1, match: "APTO VILA OLIMPIA", cat: "rent" },
    { name: "Cartão Inter", category: "Cartão", icon: "credit-card", amount: 215000, day: 10, scope: "house", housing: 0, match: "FATURA INTER", cat: "cardpay" },
    { name: "Condomínio", category: "Moradia", icon: "building", amount: 158000, day: 10, scope: "house", housing: 1, match: "CONDOMINIO", cat: "utilities" },
    { name: "Luz", category: "Moradia", icon: "zap", amount: 34000, day: 12, scope: "house", housing: 1, match: "ENEL", cat: "utilities" },
    { name: "Internet", category: "Moradia", icon: "wifi", amount: 12990, day: 15, scope: "house", housing: 1, match: "VIVO FIBRA", cat: "internet" },
    { name: "Reserva", category: "Investimento", icon: "piggy-bank", amount: 400000, day: 5, scope: "personal", housing: 0, match: "APLICACAO RESERVA", cat: "invest" },
    { name: "Ajuda família", category: "Família", icon: "heart-handshake", amount: 300000, day: 12, scope: "personal", housing: 0, match: "PIX AJUDA FAMILIA", cat: "transfer" },
  ],
  categories: [
    ["groceries", "Supermercado", "dia_a_dia"], ["eating", "Restaurantes", "dia_a_dia"],
    ["delivery", "Delivery", "dia_a_dia"], ["transport", "Transporte", "dia_a_dia"],
    ["shopping", "Compras", "dia_a_dia"], ["leisure", "Lazer", "dia_a_dia"],
    ["pharmacy", "Farmácia", "dia_a_dia"], ["pets", "Pet", "dia_a_dia"],
    ["subscriptions", "Assinaturas", "pessoal"], ["rent", "Aluguel", "casa"],
    ["utilities", "Luz, água e condomínio", "casa"], ["internet", "Internet", "casa"],
    ["salary", "Salário", "renda"], ["transfer", "Transferências", "ignorar"],
    ["cardpay", "Pagamento de cartão", "ignorar"], ["invest", "Investimentos", "ignorar"],
  ] as [string, string, string][],
};

type Tpl = { d: number; desc: string; v: number; cat: string; inst?: [number, number, number] }; // inst: [parcela, total, valorTotal]

const BLACK_TPL: Tpl[] = [
  { d: 1, desc: "Mercado Pão de Açúcar", v: 38720, cat: "groceries" },
  { d: 1, desc: "Uber *Trip", v: 2490, cat: "transport" },
  { d: 2, desc: "Netflix.com", v: 5590, cat: "subscriptions" },
  { d: 2, desc: "Spotify", v: 2190, cat: "subscriptions" },
  { d: 3, desc: "iFood *Restaurante", v: 6840, cat: "delivery" },
  { d: 3, desc: "Geladeira Brastemp 3/10", v: 38990, cat: "shopping", inst: [3, 10, 389900] },
  { d: 3, desc: "Sofá Tok&Stok 1/6", v: 125000, cat: "shopping", inst: [1, 6, 750000] },
  { d: 4, desc: "Droga Raia", v: 8975, cat: "pharmacy" },
  { d: 4, desc: "Posto Shell", v: 21000, cat: "transport" },
  { d: 5, desc: "Zara Morumbi", v: 45990, cat: "shopping" },
  { d: 6, desc: "Outback Steakhouse", v: 31250, cat: "eating" },
  { d: 6, desc: "iCloud", v: 1490, cat: "subscriptions" },
  { d: 7, desc: "Mercado Extra", v: 24780, cat: "groceries" },
  { d: 7, desc: "99 Corrida", v: 3150, cat: "transport" },
  { d: 8, desc: "Cinemark", v: 9800, cat: "leisure" },
  { d: 8, desc: "Padaria Bella Paulista", v: 4260, cat: "eating" },
  { d: 9, desc: "Amazon Marketplace", v: 18990, cat: "shopping" },
  { d: 9, desc: "Uber *Trip", v: 1980, cat: "transport" },
  { d: 10, desc: "Starbucks", v: 3480, cat: "eating" },
  { d: 13, desc: "Hortifruti Natural", v: 15630, cat: "groceries" },
  { d: 15, desc: "Posto Ipiranga", v: 19800, cat: "transport" },
  { d: 17, desc: "Livraria Cultura", v: 12900, cat: "leisure" },
  { d: 20, desc: "Rappi", v: 5890, cat: "delivery" },
  { d: 22, desc: "Restaurante Madalena", v: 27400, cat: "eating" },
  { d: 26, desc: "Farmácia Pague Menos", v: 6720, cat: "pharmacy" },
  { d: 29, desc: "Mercado Pão de Açúcar", v: 29840, cat: "groceries" },
  { d: 30, desc: "Uber *Trip", v: 3310, cat: "transport" },
];

const ORANGE_TPL: Tpl[] = [
  { d: 1, desc: "Supermercado Dia", v: 29800, cat: "groceries" },
  { d: 2, desc: "Droga Raia", v: 7840, cat: "pharmacy" },
  { d: 3, desc: "Leroy Merlin", v: 31900, cat: "shopping" },
  { d: 5, desc: "Hortifruti Natural", v: 12340, cat: "groceries" },
  { d: 6, desc: "Pet Love", v: 18990, cat: "pets" },
  { d: 8, desc: "Mercado Livre", v: 14990, cat: "shopping" },
  { d: 9, desc: "Carrefour Bairro", v: 26750, cat: "groceries" },
  { d: 10, desc: "Diarista Maria", v: 18000, cat: "shopping" },
  { d: 12, desc: "Carrefour Bairro", v: 21500, cat: "groceries" },
  { d: 15, desc: "Feira Livre", v: 8900, cat: "groceries" },
  { d: 18, desc: "Farmácia Drogasil", v: 5600, cat: "pharmacy" },
  { d: 21, desc: "Petz", v: 12200, cat: "pets" },
  { d: 24, desc: "Supermercado Dia", v: 3100, cat: "groceries" },
];

const BANK_TPL: Tpl[] = [
  { d: 2, desc: "PIX Feira do Bairro", v: 8500, cat: "groceries" },
  { d: 3, desc: "Cabeleireiro Studio 21", v: 18000, cat: "leisure" },
  { d: 4, desc: "Uber *Trip", v: 2290, cat: "transport" },
  { d: 6, desc: "Restaurante Fogo de Chão", v: 28500, cat: "eating" },
  { d: 7, desc: "PIX Lavanderia Express", v: 7600, cat: "shopping" },
  { d: 9, desc: "Padaria Santa Clara", v: 3150, cat: "eating" },
  { d: 10, desc: "PIX Barbearia", v: 6500, cat: "leisure" },
  { d: 14, desc: "Estacionamento Shopping", v: 4200, cat: "transport" },
  { d: 19, desc: "PIX Churrasco Amigos", v: 15000, cat: "leisure" },
  { d: 23, desc: "Mercado Municipal", v: 11800, cat: "groceries" },
];

/* ------------------------------------------------------------------ */

function monthDay(m: string, d: number): string {
  return dueDateOf(m, d);
}

export function clearDemoData(d: DatabaseSync): void {
  d.exec(`
    DELETE FROM goal_entries; DELETE FROM goals;
        DELETE FROM transactions WHERE pluggy_id IS NULL AND import_hash IS NULL;
    DELETE FROM card_bills WHERE pluggy_id IS NULL;
    DELETE FROM accounts WHERE source = 'manual';
    DELETE FROM bill_instances; DELETE FROM bills;
    DELETE FROM income_overrides; DELETE FROM incomes;
    DELETE FROM category_map WHERE pluggy_category_id IN (${DEMO.categories.map((c) => `'${c[0]}'`).join(",")});
    DELETE FROM settings WHERE key IN ('demo_mode', 'dia_a_dia_budget');
  `);
}

export function seedDemoData(d: DatabaseSync): void {
  d.exec("BEGIN");
  try {
    clearDemoData(d);
    seedInner(d);
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

function seedInner(d: DatabaseSync): void {
  const today = todayISO();
  const cm = currentMonth();
  const todayDay = Number(today.slice(8, 10));
  const now = new Date().toISOString();
  const setSet = d.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  setSet.run("demo_mode", "1");
  setSet.run("dia_a_dia_budget", String(DEMO.diaADiaBudget));

  for (const [id, name, bucket] of DEMO.categories) {
    d.prepare("INSERT OR REPLACE INTO category_map (pluggy_category_id, name, bucket) VALUES (?, ?, ?)").run(id, name, bucket);
  }
  const catName = new Map(DEMO.categories.map((c) => [c[0], c[1]]));

  const me = (d.prepare("SELECT id FROM people WHERE is_me = 1").get() as { id: number }).id;
  d.prepare("INSERT INTO incomes (person_id, description, amount, recurring) VALUES (?, 'Salário', ?, 1)").run(me, DEMO.salario);

  // contas bancárias e cartões
  const acc = d.prepare(
    `INSERT INTO accounts (id, source, type, subtype, name, bank_name, color, number_last4, balance, credit_limit, available_limit, close_day, due_day, owner_person_id)
     VALUES (?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
  );
  acc.run("demo_cc_eu", "BANK", "CHECKING_ACCOUNT", "Conta corrente", "Itaú", "dark", "3318", 1485237, null, null, null, me);
  acc.run("demo_card_black", "CREDIT", "CREDIT_CARD", "Itaú Personnalité Black", "Itaú", "dark", "4821", 0, 2000000, 28, 5, me);
  acc.run("demo_card_orange", "CREDIT", "CREDIT_CARD", "Inter Mastercard Gold", "Inter", "orange", "7305", 0, 1200000, 28, 10, me);

  // contas (bills)
  const insBill = d.prepare(
    `INSERT INTO bills (name, category, icon, amount_expected, due_day, scope, payer_person_id, is_housing, match_pattern)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const billIds: number[] = DEMO.bills.map((b) =>
    Number(insBill.run(b.name, b.category, b.icon, b.amount, b.day, b.scope, me, b.housing, b.match).lastInsertRowid),
  );

  const insTx = d.prepare(
    `INSERT INTO transactions (id, account_id, date, description, amount, pluggy_category, pluggy_category_id, status,
       installment_number, total_installments, total_amount, bill_instance_id, person_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?, ?, ?)`,
  );
  let seq = 0;
  const addTx = (
    account: string, date: string, desc: string, amount: number, cat: string,
    inst?: [number, number, number], billInstanceId: number | null = null,
  ): string => {
    const id = `demo_tx_${String(++seq).padStart(4, "0")}`;
    insTx.run(id, account, date, desc, amount, catName.get(cat) ?? cat, cat, inst?.[0] ?? null, inst?.[1] ?? null, inst?.[2] ?? null, billInstanceId, me, now);
    return id;
  };

  const insInst = d.prepare(
    "INSERT INTO bill_instances (bill_id, month, amount, due_date, paid, paid_at, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const linkTx = d.prepare("UPDATE transactions SET bill_instance_id = ? WHERE id = ?");

  const cardTotals = new Map<string, Map<string, number>>();
  const bumpCard = (accId: string, closeDay: number, date: string, amount: number) => {
    const ref = refMonthOf(date, closeDay);
    const m = cardTotals.get(accId) ?? new Map<string, number>();
    m.set(ref, (m.get(ref) ?? 0) + amount);
    cardTotals.set(accId, m);
  };

  const months = [addMonths(cm, -5), addMonths(cm, -4), addMonths(cm, -3), addMonths(cm, -2), addMonths(cm, -1), cm];
  const instanceByBillMonth = new Map<string, number>();

  months.forEach((m, mi) => {
    const isCur = m === cm;
    const factor = (i: number) => 0.9 + ((i * 7 + mi * 3) % 9) * 0.025;
    const lim = (day: number) => (isCur ? day <= todayDay : true);

    // salários
    if (!isCur || todayDay >= 5) {
      addTx("demo_cc_eu", monthDay(m, 5), "CREDITO SALARIO EMPRESA", DEMO.salario, "salary");
    }

    // instâncias das contas + pagamentos
    DEMO.bills.forEach((b, bi) => {
      const due = monthDay(m, b.day);
      const paid = isCur ? due < today : true;
      let amount = b.amount;
      if (b.name === "Luz") amount = Math.round(b.amount * factor(bi));
      let txId: string | null = null;
      if (paid) {
        txId = addTx("demo_cc_eu", due, `PAGTO ${b.match}`, -amount, b.cat);
      }
      const r = insInst.run(billIds[bi], m, amount, due, paid ? 1 : 0, paid ? due : null, txId);
      const instId = Number(r.lastInsertRowid);
      instanceByBillMonth.set(`${bi}|${m}`, instId);
      if (txId) linkTx.run(instId, txId);
    });

    // cartão preto (meu): dia a dia + parcelas + assinaturas
    BLACK_TPL.forEach((t, i) => {
      // dias 29-31 pertencem ao fim do mês anterior (já fechado) — só geramos se o mês existir inteiro
      const date = monthDay(m, t.d);
      if (!lim(t.d)) return;
      let v = t.v;
      let inst = t.inst;
      if (inst) {
        const back = isCur ? 0 : mi === months.length - 2 ? 1 : mi === months.length - 3 ? 2 : -1;
        const n = inst[0] - back;
        if (back < 0 || n < 1) return;
        inst = [n, inst[1], inst[2]];
        v = Math.round(inst[2] / inst[1]);
        const base = t.desc.replace(/\s*\d+\/\d+$/, "");
        addTx("demo_card_black", date, `${base} ${n}/${inst[1]}`, -v, t.cat, inst);
        bumpCard("demo_card_black", 28, date, v);
        return;
      }
      v = t.cat === "subscriptions" ? t.v : Math.round(t.v * factor(i));
      addTx("demo_card_black", date, t.desc, -v, t.cat);
      bumpCard("demo_card_black", 28, date, v);
    });

    // cartão laranja: vinculado à conta "Cartão Inter" do mês
    const houseCardInst = instanceByBillMonth.get(`2|${m}`)!;
    ORANGE_TPL.forEach((t, i) => {
      if (!lim(t.d)) return;
      const v = Math.round(t.v * factor(i + 2));
      const date = monthDay(m, t.d);
      addTx("demo_card_orange", date, t.desc, -v, t.cat, undefined, houseCardInst);
      bumpCard("demo_card_orange", 28, date, v);
    });

    // conta corrente: pagamento das faturas + dia a dia
    if (!isCur) {
      addTx("demo_cc_eu", monthDay(m, 5), "PAGAMENTO FATURA ITAU BLACK", -(cardTotals.get("demo_card_black")?.get(addMonths(m, -1)) ?? 480000), "cardpay");
    }
    BANK_TPL.forEach((t, i) => {
      if (!lim(t.d)) return;
      addTx("demo_cc_eu", monthDay(m, t.d), t.desc, -Math.round(t.v * factor(i + 4)), t.cat);
    });
  });

  // faturas dos cartões
  const insCb = d.prepare(
    "INSERT INTO card_bills (id, account_id, due_date, close_date, total_amount, ref_month, paid) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const cards: [string, number, number][] = [["demo_card_black", 28, 5], ["demo_card_orange", 28, 10]];
  for (const [accId, close, due] of cards) {
    for (const ref of [addMonths(cm, -2), addMonths(cm, -1), cm]) {
      const total = cardTotals.get(accId)?.get(ref) ?? 0;
      const dueRef = due <= close ? addMonths(ref, 1) : ref;
      insCb.run(`${accId}_${ref}`, accId, dueDateOf(dueRef, due), dueDateOf(ref, close), total, ref, ref < cm ? 1 : 0);
    }
  }

  // metas
  const insGoal = d.prepare(
    "INSERT INTO goals (name, icon, kind, target_amount, monthly_contribution, interest_rate_monthly, start_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insEntry = d.prepare("INSERT INTO goal_entries (goal_id, date, amount, balance_after) VALUES (?, ?, ?, ?)");
  const reserva = Number(insGoal.run("Reserva", "piggy-bank", "reserva", 3000000, 400000, null, monthDay(months[0], 5), "Reserva de emergência (6 meses de despesas).").lastInsertRowid);
  let bal = 0;
  [200000, 300000, 250000, 400000, 400000, 400000].forEach((amt, i) => {
    bal += amt;
    if (months[i] === cm && todayDay < 5) { bal -= amt; return; }
    insEntry.run(reserva, monthDay(months[i], 5), amt, bal);
  });
  const obra = Number(insGoal.run("Obra do apartamento", "hammer", "projeto", 8000000, 600000, 1.2, monthDay(months[0], 10), "Reforma da cozinha e dos banheiros, rendendo em CDB.").lastInsertRowid);
  bal = 0;
  [1000000, 600000, 600000, 600000, 600000, 600000].forEach((amt, i) => {
    bal = Math.round(bal * 1.012) + amt;
    if (months[i] === cm && todayDay < 10) return;
    insEntry.run(obra, monthDay(months[i], 10), amt, bal);
  });
}

/** Primeiro uso: cria a pessoa, configurações padrão e o demo. */
export function seedIfEmpty(d: DatabaseSync): void {
  const row = d.prepare("SELECT COUNT(*) AS n FROM people").get() as { n: number };
  if (row.n > 0) return;
  d.exec("BEGIN");
  try {
    const ins = d.prepare("INSERT INTO people (name, avatar_emoji, color, is_me) VALUES (?, ?, ?, ?)");
    ins.run("Você", "🧑🏽", "#2563eb", 1);
    const set = d.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    set.run("theme", "light");
    set.run("moradia_ref", String(DEMO.moradiaRef));
    seedInner(d);
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
