import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Banknote, Landmark, ListChecks, ShieldAlert, Tags, Wallet } from "lucide-react";
import { CreditPaymentsChart } from "@/components/common/Charts";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/States";
import { PaymentMethodBadge } from "@/components/finance/PaymentParts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { date, money, moneyCompact } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/")({
  head: () => pageHead("Finance Dashboard", "Outstanding debt, approvals, payments and credit risk at a glance."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.financeDashboard()),
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const { data: d } = useSuspenseQuery(q.financeDashboard());
  const histPct = d.historicalTarget > 0 ? Math.min(100, (d.totalHistorical / d.historicalTarget) * 100) : 0;
  const queue = [
    { to: "/finance/approvals" as const, label: "Transaction approvals", n: d.pendingApprovals, icon: ListChecks },
    { to: "/finance/exceptions" as const, label: "Exceptional credit", n: d.pendingExceptions, icon: ShieldAlert },
    { to: "/finance/prices" as const, label: "Price requests", n: d.pendingPriceRequests, icon: Tags },
    { to: "/finance/historical" as const, label: "Historical records to verify", n: d.pendingHistorical, icon: Landmark },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Finance overview"
        description={`${d.guestCount} guest accounts on credit.`}
        actions={
          <Button asChild>
            <Link to="/finance/payments">
              <Banknote className="h-4 w-4" /> Record payment
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding debt" value={moneyCompact(d.totalOutstanding)} hint={money(d.totalOutstanding)} icon={Wallet} highlight />
        <StatCard label="Approved credit" value={moneyCompact(d.totalApprovedCredit)} hint={`${d.approvedCount} transactions`} icon={ListChecks} tone="info" delay={40} />
        <StatCard label="Payments received" value={moneyCompact(d.totalPayments)} hint={money(d.totalPayments)} icon={Banknote} tone="success" delay={80} />
        <StatCard label="Guests over limit" value={d.exceeding.length} icon={AlertTriangle} tone={d.exceeding.length ? "danger" : "muted"} delay={120} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel className="min-w-0">
          <SectionTitle title="Credit vs payments" />
          <CreditPaymentsChart data={d.series} />
        </Panel>
        <Panel delay={60} className="min-w-0">
          <SectionTitle title="Waiting for you" />
          <ul className="space-y-2">
            {queue.map((x) => (
              <li key={x.to}>
                <Link to={x.to} className="flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 transition-colors hover:border-primary/40">
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <x.icon className="h-4 w-4 text-primary" /> {x.label}
                  </span>
                  <span className={x.n ? "font-display text-xl font-semibold text-primary" : "text-sm text-muted-foreground"}>{x.n}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t pt-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Historical debt moved in</div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="font-semibold tabular-nums">{money(d.totalHistorical)}</span>
              <span className="text-xs text-muted-foreground">of {moneyCompact(d.historicalTarget)}</span>
            </div>
            <Progress value={histPct} className="mt-2 h-1.5 bg-muted" />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel delay={120} className="min-w-0">
          <SectionTitle title="Guests over their limit" />
          {d.exceeding.length === 0 ? (
            <EmptyState title="No guest is over their limit" />
          ) : (
            <ul className="divide-y">
              {d.exceeding.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to="/finance/guests/$id" params={{ id: g.id }} className="min-w-0 font-medium hover:text-primary">
                    <span className="block truncate">{g.fullName}</span>
                    <span className="block text-xs text-muted-foreground">Limit {money(g.creditLimit)}</span>
                  </Link>
                  <span className="shrink-0 font-semibold text-destructive tabular-nums">{money(g.outstandingDebt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel delay={180} className="min-w-0">
          <SectionTitle
            title="Recent payments"
            action={
              <Button variant="link" size="sm" asChild>
                <Link to="/finance/payment-history">View all</Link>
              </Button>
            }
          />
          {d.recentPayments.length === 0 ? (
            <EmptyState title="No payments yet" />
          ) : (
            <ul className="divide-y">
              {d.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.guestName}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {date(p.paidAt)} <PaymentMethodBadge method={p.method} />
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-success tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
