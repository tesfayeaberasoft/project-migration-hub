import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { TX_STATUS_LABEL } from "@/components/common/StatusBadge";
import { TransactionsTable } from "@/components/transactions/TransactionParts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import type { TransactionStatus } from "@/types";

export const Route = createFileRoute("/_portal/cashier/history")({
  head: () => pageHead("Transaction History", "Every credit transaction recorded at the desk."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.transactions()),
  component: HistoryPage,
});

function HistoryPage() {
  const { data } = useSuspenseQuery(q.transactions());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TransactionStatus | "all">("all");
  const term = search.trim().toLowerCase();
  const rows = data.filter((t) => (status === "all" || t.status === status) && (!term || `${t.code} ${t.guestName}`.toLowerCase().includes(term)));

  return (
    <>
      <PageHeader eyebrow="Credit desk" title="Transaction history" description={`${rows.length} of ${data.length} transactions`} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by code or guest name" className="max-w-sm flex-1" />
        <Select value={status} onValueChange={(v) => setStatus(v as TransactionStatus | "all")}>
          <SelectTrigger className="w-full bg-surface sm:w-56" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(TX_STATUS_LABEL) as TransactionStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {TX_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TransactionsTable rows={rows} detailTo="/cashier/transactions/$id" />
    </>
  );
}
