import "server-only";
import { all } from "../db";
import type { Bill } from "@/lib/types";

export function listBills(): Bill[] {
  return all<Bill>("SELECT * FROM bills WHERE active = 1 ORDER BY due_day, name");
}
