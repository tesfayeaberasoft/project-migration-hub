import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { PaymentsTable } from "@/components/finance/PaymentParts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { paymentsService } from "@/services/finance.service";
import type { Payment } from "@/types";

export const Route = createFileRoute("/_portal/finance/payment-history")({
  head: () => pageHead("Payment History", "Every guest payment, with receipts and verification."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.payments()),
  component: PaymentHistory,
});

function PaymentHistory() {
  const { data } = useSuspenseQuery(q.payments());
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<"all" | Payment["method"] | "unverified">("all");
  const term = search.trim().toLowerCase();
  const rows = data.filter(
    (p) =>
      (method === "all" || (method === "unverified" ? !p.verified : p.method === method)) &&
      (!term || `${p.guestName} ${p.receiptNumber} ${p.reference ?? ""}`.toLowerCase().includes(term)),
  );
  const total = rows.filter((p) => p.verified).reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader eyebrow="Payments" title="Payment history" description={`${rows.length} payments · ${money(total)} verified`} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search guest, receipt or reference" className="max-w-sm flex-1" />
        <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
          <SelectTrigger className="w-full bg-surface sm:w-52" aria-label="Filter payments">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_transfer">Bank transfer</SelectItem>
            <SelectItem value="unverified">Awaiting verification</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <PaymentsTable rows={rows} actions={(p) => (!p.verified ? <VerifyButton p={p} /> : null)} />
    </>
  );
}

function VerifyButton({ p }: { p: Payment }) {
  const verify = useAction(() => paymentsService.verify(p.id), { success: `Payment ${p.receiptNumber} verified.` });
  return (
    <Button size="sm" variant="success" onClick={() => verify.mutate(undefined)} disabled={verify.isPending}>
      <BadgeCheck className="h-4 w-4" /> Verify
    </Button>
  );
}
