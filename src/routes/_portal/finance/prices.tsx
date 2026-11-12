import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel, TableShell } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { dateTime, money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { catalogService } from "@/services/catalog.service";
import type { PriceRequest } from "@/types";

export const Route = createFileRoute("/_portal/finance/prices")({
  head: () => pageHead("Price Requests", "Approve catalog price changes and special transaction prices."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.priceRequests()),
  component: PricesPage,
});

function PricesPage() {
  const { data } = useSuspenseQuery(q.priceRequests());
  const pending = data.filter((r) => r.status === "pending");
  const decided = data.filter((r) => r.status !== "pending");
  return (
    <>
      <PageHeader eyebrow="Approvals" title="Price requests" description="Catalog price changes proposed by the Administrator and special prices requested by cashiers." />
      <SectionTitle title={`Waiting (${pending.length})`} />
      {!pending.length ? (
        <EmptyState title="No price requests waiting" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((r, i) => (
            <PendingCard key={r.id} r={r} delay={i * 40} />
          ))}
        </div>
      )}
      <div className="mt-10">
        <SectionTitle title="Decided" />
        {!decided.length ? (
          <EmptyState title="No decisions yet" />
        ) : (
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">From</TableHead>
                  <TableHead className="text-right">To</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decided.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.serviceName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.kind === "catalog" ? "Catalog" : `Special · ${r.transactionCode ?? ""}`}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.currentPrice)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{money(r.requestedPrice)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.requestedBy}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={r.status === "approved" ? "success" : "muted"} className="capitalize">
                        {r.status}
                      </Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.decidedBy} · {dateTime(r.decidedAt)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        )}
      </div>
    </>
  );
}

function PendingCard({ r, delay }: { r: PriceRequest; delay: number }) {
  const approve = useAction(() => catalogService.approvePrice(r.id), { success: `New price approved for ${r.serviceName}.` });
  const reject = useAction(() => catalogService.rejectPrice(r.id), { success: "Price request rejected." });
  const diff = r.requestedPrice - r.currentPrice;
  return (
    <Panel delay={delay} className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{r.serviceName}</h3>
        <Badge variant={r.kind === "catalog" ? "info" : "gold"}>{r.kind === "catalog" ? "Catalog price" : "Special price"}</Badge>
      </div>
      {r.kind === "transaction" && r.transactionId && (
        <Link to="/finance/transactions/$id" params={{ id: r.transactionId }} className="text-xs text-primary hover:underline">
          For transaction {r.transactionCode}
        </Link>
      )}
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-sm text-muted-foreground line-through">{money(r.currentPrice)}</span>
        <span className="font-display text-2xl font-semibold text-primary">{money(r.requestedPrice)}</span>
      </div>
      <div className={diff < 0 ? "text-xs text-warning" : "text-xs text-muted-foreground"}>
        {diff < 0 ? "−" : "+"}
        {money(Math.abs(diff))} ({r.currentPrice ? ((diff / r.currentPrice) * 100).toFixed(0) : "—"}%)
      </div>
      <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">“{r.reason}”</p>
      <div className="mt-2 text-xs text-muted-foreground">
        {r.requestedBy} · {dateTime(r.requestedAt)}
      </div>
      <div className="mt-auto flex gap-2 pt-4">
        <Button size="sm" variant="success" onClick={() => approve.mutate(undefined)} disabled={approve.isPending || reject.isPending}>
          <Check className="h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => reject.mutate(undefined)} disabled={approve.isPending || reject.isPending}>
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
    </Panel>
  );
}
