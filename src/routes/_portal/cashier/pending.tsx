import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { TransactionsTable } from "@/components/transactions/TransactionParts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RESERVING_STATUSES } from "@/lib/credit";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import type { TransactionStatus } from "@/types";

const TABS: { id: string; label: string; status: TransactionStatus[]; empty: string }[] = [
  { id: "guest", label: "Awaiting guest", status: ["pending_guest"], empty: "No transactions are waiting for guest confirmation." },
  { id: "disputed", label: "Disputed", status: ["disputed"], empty: "No disputed transactions." },
  { id: "price", label: "Price approval", status: ["pending_price_approval"], empty: "No special-price requests are waiting." },
  { id: "finance", label: "Awaiting Finance", status: ["pending_finance", "pending_exception"], empty: "Nothing is waiting for Finance." },
];

export const Route = createFileRoute("/_portal/cashier/pending")({
  head: () => pageHead("Pending & Disputes", "Transactions waiting for the guest, Finance, or a correction."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.transactions({ status: RESERVING_STATUSES })),
  component: PendingPage,
});

function PendingPage() {
  const { data } = useSuspenseQuery(q.transactions({ status: RESERVING_STATUSES }));
  const [tab, setTab] = useState(TABS[0]!.id);
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const rows = data.filter((t) => current.status.includes(t.status));

  return (
    <>
      <PageHeader eyebrow="Credit desk" title="Pending & disputes" description="Open a transaction to confirm it in the hotel with the guest's PIN or SMS code, correct it, or cancel it." />
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => {
            const n = data.filter((x) => t.status.includes(x.status)).length;
            return (
              <TabsTrigger key={t.id} value={t.id} className="gap-2">
                {t.label}
                <Badge variant={t.id === "disputed" && n ? "danger" : "muted"}>{n}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <TransactionsTable rows={rows} detailTo="/cashier/transactions/$id" empty={current.empty} />
    </>
  );
}
