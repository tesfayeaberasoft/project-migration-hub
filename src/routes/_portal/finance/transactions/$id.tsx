import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CreditSummary } from "@/components/common/CreditSummary";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { DecisionActions } from "@/components/finance/DecisionActions";
import { TransactionDetail } from "@/components/transactions/TransactionParts";
import { Button } from "@/components/ui/button";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/transactions/$id")({
  head: () => pageHead("Transaction Review", "Review a credit transaction and approve or reject it."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q.transaction(params.id)),
  component: FinanceTransactionPage,
});

function FinanceTransactionPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(q.transaction(id));
  const { transaction: tx, account } = data;
  const waiting = tx.status === "pending_finance" || tx.status === "pending_exception";

  return (
    <>
      <PageHeader
        eyebrow="Approvals"
        title={`Transaction ${tx.code}`}
        actions={
          <Button variant="ghost" asChild>
            <Link to={tx.status === "pending_exception" ? "/finance/exceptions" : "/finance/approvals"}>
              <ArrowLeft className="h-4 w-4" /> Back to approvals
            </Link>
          </Button>
        }
      />
      <TransactionDetail
        tx={tx}
        aside={
          <>
            {waiting && (
              <Panel className="border-primary/30 bg-gold-soft">
                <SectionTitle title="Your decision" />
                <p className="mb-4 text-sm text-muted-foreground">
                  {tx.status === "pending_exception" ? "This goes over the guest's available credit. Approving requires a written reason." : "Confirmed by the guest. Approving adds it to their debt."}
                </p>
                <DecisionActions tx={tx} size="default" block />
              </Panel>
            )}
            {account && (
              <Panel>
                <SectionTitle
                  title="Guest credit"
                  action={
                    <Button variant="link" size="sm" asChild>
                      <Link to="/finance/guests/$id" params={{ id: account.id }}>
                        Open account
                      </Link>
                    </Button>
                  }
                />
                <CreditSummary account={account} compact className="border-0 bg-transparent p-0" />
              </Panel>
            )}
          </>
        }
      />
    </>
  );
}
