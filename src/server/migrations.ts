import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { seedDemoData } from "./seed";

const V1 = `
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🙂',
  color TEXT NOT NULL DEFAULT '#2563eb',
  is_me INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  recurring INTEGER NOT NULL DEFAULT 1,
  month TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE income_overrides (
  person_id INTEGER NOT NULL REFERENCES people(id),
  month TEXT NOT NULL,
  amount INTEGER NOT NULL,
  PRIMARY KEY (person_id, month)
);

CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  icon TEXT,
  amount_expected INTEGER NOT NULL,
  due_day INTEGER NOT NULL,
  scope TEXT NOT NULL DEFAULT 'house' CHECK (scope IN ('house','personal')),
  payer_person_id INTEGER NOT NULL REFERENCES people(id),
  my_share REAL,
  is_housing INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  match_pattern TEXT
);

CREATE TABLE bill_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  transaction_id TEXT,
  UNIQUE (bill_id, month)
);
CREATE INDEX idx_bill_instances_month ON bill_instances(month);

CREATE TABLE settlements (
  month TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  direction TEXT NOT NULL,
  done_at TEXT NOT NULL
);

CREATE TABLE pluggy_items (
  id TEXT PRIMARY KEY,
  connector_name TEXT,
  status TEXT,
  execution_status TEXT,
  last_updated_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'manual',
  pluggy_id TEXT UNIQUE,
  item_id TEXT,
  type TEXT NOT NULL DEFAULT 'BANK',
  subtype TEXT,
  name TEXT NOT NULL,
  bank_name TEXT,
  color TEXT,
  number_last4 TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  credit_limit INTEGER,
  available_limit INTEGER,
  close_day INTEGER,
  due_day INTEGER,
  owner_person_id INTEGER
);

CREATE TABLE card_bills (
  id TEXT PRIMARY KEY,
  pluggy_id TEXT UNIQUE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  due_date TEXT,
  close_date TEXT,
  total_amount INTEGER NOT NULL DEFAULT 0,
  minimum_amount INTEGER,
  ref_month TEXT,
  paid INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  pluggy_id TEXT UNIQUE,
  import_hash TEXT UNIQUE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  pluggy_category TEXT,
  pluggy_category_id TEXT,
  bucket_override TEXT,
  status TEXT,
  installment_number INTEGER,
  total_installments INTEGER,
  total_amount INTEGER,
  card_bill_id TEXT,
  bill_instance_id INTEGER,
  person_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tx_date ON transactions(date);
CREATE INDEX idx_tx_account ON transactions(account_id);

CREATE TABLE category_map (
  pluggy_category_id TEXT PRIMARY KEY,
  name TEXT,
  bucket TEXT NOT NULL DEFAULT 'dia_a_dia'
);

CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  kind TEXT NOT NULL DEFAULT 'reserva' CHECK (kind IN ('reserva','projeto')),
  target_amount INTEGER NOT NULL DEFAULT 0,
  monthly_contribution INTEGER NOT NULL DEFAULT 0,
  interest_rate_monthly REAL,
  start_date TEXT,
  notes TEXT
);

CREATE TABLE goal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL
);

CREATE TABLE sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT,
  message TEXT,
  tx_upserted INTEGER NOT NULL DEFAULT 0
);
`;

/** V2: app de usuário único. Remove a parceira e reatribui tudo à pessoa restante (colunas/tabelas antigas ficam sem uso). */
const ME = "COALESCE((SELECT id FROM people WHERE is_me = 1 LIMIT 1), (SELECT MIN(id) FROM people))";
const V2 = `
DELETE FROM income_overrides WHERE person_id <> ${ME};
DELETE FROM incomes WHERE person_id <> ${ME};
UPDATE bills SET payer_person_id = ${ME}, my_share = NULL;
UPDATE accounts SET owner_person_id = ${ME};
UPDATE transactions SET person_id = ${ME};
UPDATE people SET is_me = 1 WHERE id = ${ME};
DELETE FROM people WHERE id <> ${ME};
DELETE FROM settlements;
DELETE FROM settings WHERE key IN ('split_mode', 'split_fixed_me', 'current_person');
`;

/** V3: transferências entre contas próprias (par de transações) e regras de categoria por texto. */
const V3 = `
ALTER TABLE transactions ADD COLUMN transfer_pair TEXT;
CREATE TABLE tx_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  bucket TEXT,
  category TEXT,
  created_at TEXT NOT NULL
);
`;

/** V4: dívidas avulsas (pra quem eu devo) e pagamentos parciais. */
const V4 = `
CREATE TABLE debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creditor TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  due_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  settled_at TEXT
);
CREATE TABLE debt_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL
);
CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);
`;

const MIGRATIONS: string[] = [V1, V2, V3, V4];

export function migrate(d: DatabaseSync): void {
  d.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = d.prepare("SELECT MAX(version) AS v FROM schema_version").get() as { v: number | null };
  let current = row?.v ?? 0;
  const from = current;
  while (current < MIGRATIONS.length) {
    d.exec("BEGIN");
    try {
      d.exec(MIGRATIONS[current]);
      current += 1;
      d.prepare("INSERT INTO schema_version (version) VALUES (?)").run(current);
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
  }
  // Banco demo criado antes do V2 ainda tem dados da parceira: recria o demo para um usuário só.
  if (from >= 1 && from < 2) {
    const demo = d.prepare("SELECT value FROM settings WHERE key = 'demo_mode'").get() as { value: string } | undefined;
    if (demo?.value === "1") seedDemoData(d);
  }
}
