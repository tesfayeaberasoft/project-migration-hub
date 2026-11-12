import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { moneyCompact } from "@/lib/format";

const axis = { stroke: "var(--color-muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };
const tooltipStyle = {
  contentStyle: { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "var(--color-foreground)" },
};

export function CreditPaymentsChart({ data, height = 280 }: { data: { label: string; credit: number; payments: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={(v: number) => moneyCompact(v, "")} width={56} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => moneyCompact(v)} cursor={{ fill: "var(--color-accent)", opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="credit" name="Approved credit" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="payments" name="Payments" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityChart({ data }: { data: { label: string; transactions: number; logins: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gTx" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gLg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="transactions" name="Transactions" stroke="var(--color-chart-1)" fill="url(#gTx)" strokeWidth={2} />
        <Area type="monotone" dataKey="logins" name="Sign-ins" stroke="var(--color-chart-4)" fill="url(#gLg)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
