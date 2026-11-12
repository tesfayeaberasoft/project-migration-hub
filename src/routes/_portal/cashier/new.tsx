import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CreditSummary } from "@/components/common/CreditSummary";
import { GuestPicker } from "@/components/common/GuestPicker";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { TransactionEditor, type EditorValue } from "@/components/transactions/TransactionEditor";
import { useAction } from "@/hooks/use-action";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { transactionsService } from "@/services/transactions.service";

export const Route = createFileRoute("/_portal/cashier/new")({
  head: () => pageHead("New Transaction", "Record services a guest took on credit."),
  validateSearch: (search: Record<string, unknown>): { guestId?: string } =>
    typeof search["guestId"] === "string" && search["guestId"] ? { guestId: search["guestId"] } : {},
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(q.guestAccounts()), context.queryClient.ensureQueryData(q.services())]),
  component: NewTransaction,
});

function NewTransaction() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: accounts } = useSuspenseQuery(q.guestAccounts());
  const [guestId, setGuestId] = useState(search.guestId ?? "");
  const account = accounts.find((g) => g.id === guestId);
  const eligible = account?.status === "active";

  const create = useAction((v: EditorValue) => transactionsService.create({ ...v, guestId }), {
    success: (tx) => (tx.status === "pending_price_approval" ? `${tx.code} sent to Finance for price approval.` : `${tx.code} sent to the guest to confirm.`),
    onSuccess: (tx) => void navigate({ to: "/cashier/transactions/$id", params: { id: tx.id } }),
  });

  return (
    <>
      <PageHeader eyebrow="Credit desk" title="New transaction" description="Choose the guest, add the services they took, then send it to them to confirm." />
      <div className="space-y-6">
        <Panel>
          <SectionTitle title="1. Guest" />
          <GuestPicker value={guestId} onChange={(g) => setGuestId(g.id)} />
          {account && <CreditSummary account={account} className="mt-4" />}
        </Panel>
        <Panel delay={60}>
          <SectionTitle title="2. Services" />
          {!eligible && <p className="mb-4 text-sm text-muted-foreground">Choose an active guest first.</p>}
          <TransactionEditor
            key={guestId}
            available={account?.availableCredit}
            disabled={!eligible}
            pending={create.isPending}
            submitLabel="Send to guest"
            onSubmit={(v) => create.mutate(v)}
          />
        </Panel>
      </div>
    </>
  );
}
