"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/format";

export type FlowDatum = { label: string; entradas: number; saidas: number };

export function FlowChart({ data }: { data: FlowDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={56}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickFormatter={(v: number) => `${Math.round(v / 100000)}k`}
          />
          <Tooltip
            formatter={(v: unknown) => formatBRL(Number(v))}
            contentStyle={{ background: "var(--ink)", border: "none", borderRadius: 12, color: "var(--card)", boxShadow: "0 8px 24px rgb(0 0 0 / 0.25)", padding: "8px 12px" }}
            itemStyle={{ color: "var(--card)", fontWeight: 600 }}
            labelStyle={{ color: "var(--card)", opacity: 0.6, fontSize: 11 }}
            cursor={{ fill: "var(--soft)" }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out" />
          <Bar dataKey="saidas" name="Saídas" fill="#f43f5e" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
