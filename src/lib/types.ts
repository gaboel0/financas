export type Bucket = "dia_a_dia" | "pessoal" | "casa" | "renda" | "ignorar";
export const BUCKETS: { value: Bucket; label: string }[] = [
  { value: "dia_a_dia", label: "Dia a dia" },
  { value: "pessoal", label: "Pessoal" },
  { value: "casa", label: "Casa" },
  { value: "renda", label: "Renda" },
  { value: "ignorar", label: "Ignorar" },
];

export type Person = {
  id: number;
  name: string;
  avatar_emoji: string;
  color: string;
  is_me: number;
};

export type Account = {
  id: string;
  source: "pluggy" | "manual" | "import";
  pluggy_id: string | null;
  item_id: string | null;
  type: "BANK" | "CREDIT";
  subtype: string | null;
  name: string;
  bank_name: string | null;
  color: string | null;
  number_last4: string | null;
  balance: number;
  credit_limit: number | null;
  available_limit: number | null;
  close_day: number | null;
  due_day: number | null;
  owner_person_id: number | null;
};

export type Transaction = {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  pluggy_category: string | null;
  pluggy_category_id: string | null;
  bucket_override: Bucket | null;
  status: string | null;
  installment_number: number | null;
  total_installments: number | null;
  total_amount: number | null;
  card_bill_id: string | null;
  bill_instance_id: number | null;
  person_id: number | null;
  transfer_pair: string | null;
};

export type Bill = {
  id: number;
  name: string;
  category: string | null;
  icon: string | null;
  amount_expected: number;
  due_day: number;
  scope: "house" | "personal";
  payer_person_id: number;
  is_housing: number;
  active: number;
  match_pattern: string | null;
};

export type BillInstance = {
  id: number;
  bill_id: number;
  month: string;
  amount: number;
  due_date: string;
  paid: number;
  paid_at: string | null;
  transaction_id: string | null;
  name: string;
  icon: string | null;
  category: string | null;
  scope: "house" | "personal";
  is_housing: number;
};
