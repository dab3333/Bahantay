"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Dataviz skill: sequential magnitude job → one hue, palette.md's default
// sequential blue (step 450). Single series, so no legend box is needed —
// the chart title already says what's plotted.
const BAR_COLOR = "#2a78d6";

export type DayCount = { date: string; label: string; count: number };

export function HistoryChart({ data }: { data: DayCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fill: "var(--foreground)", opacity: 0.5, fontSize: 11 }}
          interval={1}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--foreground)", opacity: 0.5, fontSize: 11 }}
          width={24}
        />
        <Tooltip
          cursor={{ fill: "var(--foreground)", opacity: 0.06 }}
          contentStyle={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          itemStyle={{ color: "var(--foreground)" }}
          formatter={(value) => [`${value ?? 0}`, "Checks"]}
        />
        <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
