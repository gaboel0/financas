"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/lib/format";

export type CategoryDatum = { name: string; value: number; color: string };

export function CategoryDonut({ data, height = 180 }: { data: CategoryDatum[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Tooltip
            formatter={(v: unknown) => formatBRL(Number(v))}
            contentStyle={{ background: "var(--ink)", border: "none", borderRadius: 12, color: "var(--card)", boxShadow: "0 8px 24px rgb(0 0 0 / 0.25)", padding: "8px 12px" }}
            itemStyle={{ color: "var(--card)", fontWeight: 600 }}
            labelStyle={{ color: "var(--card)", opacity: 0.6, fontSize: 11 }}
          />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none" animationDuration={700} animationEasing="ease-out">
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
