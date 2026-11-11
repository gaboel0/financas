import "server-only";
import { all, get, run } from "../db";
import type { Bucket } from "@/lib/types";

/** Palavras-chave (pt/en) para sugerir o bucket de uma categoria desconhecida. */
const RULES: { bucket: Bucket; words: string[] }[] = [
  {
    bucket: "ignorar",
    words: [
      "transfer", "same person", "mesma titularidade", "credit card payment", "pagamento de fatura",
      "pagamento de cart", "fatura", "invest", "fixed income", "variable income", "renda fixa",
      "renda variável", "aplicação", "resgate", "loan", "empréstimo", "financing",
    ],
  },
  { bucket: "renda", words: ["salary", "salário", "income", "proceeds", "rendimento", "pensão recebida"] },
  {
    bucket: "casa",
    words: [
      "rent", "aluguel", "electricity", "energia", "luz", "water", "água", "gás", "internet",
      "housing", "moradia", "condom", "utilities", "home", "iptu",
    ],
  },
  {
    bucket: "pessoal",
    words: [
      "telecom", "telefon", "celular", "streaming", "subscription", "assinatura", "education",
      "educação", "escola", "curso", "health insurance", "plano de saúde", "gym", "academia",
      "digital services", "serviços digitais",
    ],
  },
];

export function guessBucket(name: string | null | undefined): Bucket {
  const n = (name ?? "").toLowerCase();
  if (!n) return "dia_a_dia";
  for (const r of RULES) if (r.words.some((w) => n.includes(w))) return r.bucket;
  return "dia_a_dia";
}

/** Garante que a categoria exista no mapa (editável) com um bucket sugerido. */
export function ensureCategory(id: string | null | undefined, name: string | null | undefined): void {
  if (!id) return;
  if (get("SELECT 1 AS x FROM category_map WHERE pluggy_category_id = ?", id)) return;
  run(
    "INSERT OR IGNORE INTO category_map (pluggy_category_id, name, bucket) VALUES (?, ?, ?)",
    id, name ?? id, guessBucket(name),
  );
}

export function listCategoryMap(): { pluggy_category_id: string; name: string | null; bucket: Bucket }[] {
  return all("SELECT pluggy_category_id, name, bucket FROM category_map ORDER BY name COLLATE NOCASE");
}

/** Regra mais recente cujo texto aparece na descrição (alias t). */
const RULE = (col: "bucket" | "category") =>
  `(SELECT r.${col} FROM tx_rules r WHERE r.${col} IS NOT NULL AND instr(lower(t.description), lower(r.pattern)) > 0 ORDER BY r.id DESC LIMIT 1)`;

/**
 * SQL reutilizável: bucket efetivo de uma transação (alias t).
 * Ordem: escolha manual > transferência entre contas próprias > regra por texto > categoria do banco.
 */
export const BUCKET_SQL =
  `COALESCE(t.bucket_override, CASE WHEN t.transfer_pair IS NOT NULL OR upper(t.description) LIKE 'TOTAL DA FATURA ANTERIOR%' THEN 'ignorar' END, ${RULE("bucket")}, (SELECT cm.bucket FROM category_map cm WHERE cm.pluggy_category_id = t.pluggy_category_id), 'dia_a_dia')`;

/** SQL reutilizável: nome da categoria exibido (regra por texto > categoria do banco). */
export const CATEGORY_SQL = `COALESCE(${RULE("category")}, NULLIF(t.pluggy_category, ''), 'Sem categoria')`;
