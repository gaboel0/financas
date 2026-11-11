"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis } from "recharts";

export type BarDatum = { label: string; amount: number; open: boolean };

export function CardsBarChart({ data, height = 140, labels = true }: { data: BarDatum[]; height?: number; labels?: boolean }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 22, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Bar dataKey="amount" radius={[8, 8, 8, 8]} animationDuration={700} animationEasing="ease-out">
            {data.map((d, i) => (
              <Cell key={i} fill={d.open ? "#2563eb" : "#93b4f5"} />
            ))}
            {labels ? <LabelList
              dataKey="amount"
              position="top"
              formatter={(v: unknown) => `R$ ${Math.round(Number(v) / 100).toLocaleString("pt-BR")}`}
              style={{ fill: "var(--ink)", fontSize: 11, fontWeight: 600 }}
            /> : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
