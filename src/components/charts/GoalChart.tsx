"use client";

import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/format";

export type GoalPoint = { label: string; saldo: number };

export function GoalChart({
  data, target, color = "#2563eb", height = 180, id,
}: {
  data: GoalPoint[];
  target?: number;
  color?: string;
  height?: number;
  id: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis hide domain={[0, target ? Math.max(target, ...data.map((d) => d.saldo)) : "auto"]} />
          <Tooltip
            formatter={(v: unknown) => formatBRL(Number(v))}
            contentStyle={{ background: "var(--ink)", border: "none", borderRadius: 12, color: "var(--card)", boxShadow: "0 8px 24px rgb(0 0 0 / 0.25)", padding: "8px 12px" }}
            itemStyle={{ color: "var(--card)", fontWeight: 600 }}
            labelStyle={{ color: "var(--card)", opacity: 0.6, fontSize: 11 }}
          />
          {target ? <ReferenceLine y={target} stroke="var(--muted)" strokeDasharray="4 4" /> : null}
          <Area type="monotone" dataKey="saldo" name="Saldo" stroke={color} strokeWidth={2.5} fill={`url(#g-${id})`} animationDuration={700} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
