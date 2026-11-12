import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DecisionActions } from "@/components/finance/DecisionActions";
import { TransactionsTable } from "@/components/transactions/TransactionParts";
import { money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/approvals")({
  head: () => pageHead("Transaction Approvals", "Guest-confirmed transactions waiting for Finance approval."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.transactions({ status: "pending_finance" })),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { data } = useSuspenseQuery(q.transactions({ status: "pending_finance" }));
  const total = data.reduce((s, t) => s + t.total, 0);
  return (
    <>
      <PageHeader
        eyebrow="Approvals"
        title="Transaction approvals"
        description={data.length ? `${data.length} confirmed by the guest, totalling ${money(total)}. Approving adds the amount to the guest's debt.` : "Confirmed transactions appear here for your approval."}
      />
      <TransactionsTable rows={data} detailTo="/finance/transactions/$id" empty="Nothing is waiting for approval." actions={(tx) => <DecisionActions tx={tx} />} />
    </>
  );
}
