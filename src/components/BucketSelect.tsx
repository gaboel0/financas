"use client";

import { useTransition } from "react";
import { BUCKETS, type Bucket } from "@/lib/types";
import { setBucket, setCategoryBucket } from "@/server/actions/transacoes";

const cls =
  "rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink outline-none focus:border-primary disabled:opacity-60";

export function BucketSelect({ id, override, effective }: { id: string; override: Bucket | null; effective: Bucket }) {
  const [pending, start] = useTransition();
  const label = BUCKETS.find((b) => b.value === effective)?.label ?? effective;
  return (
    <select
      aria-label="Classificação"
      className={cls}
      disabled={pending}
      value={override ?? "auto"}
      onChange={(e) => start(async () => { await setBucket(id, e.target.value as Bucket | "auto"); })}
    >
      <option value="auto">Auto ({label})</option>
      {BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
    </select>
  );
}

export function CategoryBucketSelect({ categoryId, bucket }: { categoryId: string; bucket: Bucket }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Bucket da categoria"
      className={cls}
      disabled={pending}
      value={bucket}
      onChange={(e) => start(async () => { await setCategoryBucket(categoryId, e.target.value as Bucket); })}
    >
      {BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
    </select>
  );
}
