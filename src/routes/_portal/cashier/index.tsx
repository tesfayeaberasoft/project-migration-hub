import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BadgeCheck, ClipboardList, Hourglass, Landmark, PlusCircle, Tags, UserRound, XCircle } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { TransactionsTable } from "@/components/transactions/TransactionParts";
import { Button } from "@/components/ui/button";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/")({
  head: () => pageHead("Cashier Dashboard", "Record credit transactions and follow their confirmation."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.cashierDashboard()),
  component: CashierDashboard,
});

function CashierDashboard() {
  const { data: d } = useSuspenseQuery(q.cashierDashboard());
  return (
    <>
      <PageHeader
        eyebrow="Cashier"
        title="Credit desk"
        description="Record services taken on credit and follow them through guest confirmation and Finance approval."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/cashier/pending">
                <Hourglass className="h-4 w-4" /> Pending & disputes
              </Link>
            </Button>
            <Button asChild>
              <Link to="/cashier/new">
                <PlusCircle className="h-4 w-4" /> New transaction
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting guest" value={d.pendingGuest} icon={UserRound} tone="warning" highlight={d.pendingGuest > 0} />
        <StatCard label="Disputed" value={d.disputed} icon={AlertTriangle} tone="danger" delay={40} hint="Correct or cancel these" />
        <StatCard label="Awaiting price approval" value={d.pendingPrice} icon={Tags} tone="info" delay={80} />
        <StatCard label="Awaiting Finance" value={d.awaitingFinance} icon={Landmark} tone="gold" delay={120} />
        <StatCard label="Approved" value={d.approved} icon={BadgeCheck} tone="success" delay={160} />
        <StatCard label="Rejected" value={d.rejected} icon={XCircle} tone="muted" delay={200} />
        <StatCard label="Recorded by me" value={d.recordedByMe} icon={ClipboardList} tone="gold" delay={240} />
        <StatCard label="All transactions" value={d.totalRecorded} icon={ClipboardList} tone="muted" delay={280} />
      </div>
      <div className="mt-8">
        <SectionTitle
          title="Recent transactions"
          action={
            <Button variant="link" asChild>
              <Link to="/cashier/history">View all</Link>
            </Button>
          }
        />
        <TransactionsTable rows={d.recent} detailTo="/cashier/transactions/$id" />
      </div>
    </>
  );
}
