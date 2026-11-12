import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/States";
import { DecisionActions } from "@/components/finance/DecisionActions";
import { itemsSummary } from "@/components/transactions/TransactionParts";
import { date, money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/exceptions")({
  head: () => pageHead("Exceptional Credit", "Transactions that go over a guest's available credit."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.transactions({ status: "pending_exception" })),
  component: ExceptionsPage,
});

function ExceptionsPage() {
  const { data } = useSuspenseQuery(q.transactions({ status: "pending_exception" }));
  return (
    <>
      <PageHeader eyebrow="Approvals" title="Exceptional credit" description="These confirmed transactions go over the guest's available credit. Approving one requires a written reason." />
      {!data.length && <EmptyState icon={<ShieldAlert className="h-5 w-5" />} title="No exceptions waiting" />}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.map((tx, i) => (
          <Panel key={tx.id} delay={i * 40} className="border-destructive/25">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to="/finance/transactions/$id" params={{ id: tx.id }} className="font-display text-2xl font-semibold text-primary hover:underline">
                  {tx.code}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {tx.guestName} · {date(tx.consumptionDate)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Over available credit by</div>
                <div className="font-display text-xl font-semibold text-destructive">{money(tx.excessAmount)}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{itemsSummary(tx)}</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Transaction total" value={money(tx.total)} />
              <Field label="Recorded by" value={tx.createdBy} />
            </div>
            <div className="mt-5 border-t pt-4">
              <DecisionActions tx={tx} />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
