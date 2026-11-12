import { Link } from "@tanstack/react-router";
import { AlertTriangle, BadgeCheck, CircleDot, ShieldCheck, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Field, Panel, TableShell } from "@/components/common/Panel";
import { SectionTitle } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { TxStatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { date, dateTime, fromNow, money } from "@/lib/format";
import type { CreditTransaction } from "@/types";

export function itemsSummary(tx: CreditTransaction) {
  return tx.items.map((i) => `${i.serviceName} ×${i.quantity}`).join(", ");
}

export function ItemsTable({ tx }: { tx: CreditTransaction }) {
  return (
    <TableShell className="animate-none shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tx.items.map((i, idx) => (
            <TableRow key={`${i.serviceId}-${idx}`}>
              <TableCell>
                <div className="font-medium">{i.serviceName}</div>
                <div className="text-xs capitalize text-muted-foreground">{i.category}</div>
                {i.priceRequest && (
                  <div className="mt-1 text-xs text-info">
                    Special price {i.priceRequest.status} · catalog {money(i.catalogPrice)} — “{i.priceRequest.reason}”
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">{money(i.unitPrice)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(i.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="text-right font-semibold">
              Transaction total
            </TableCell>
            <TableCell className="text-right font-display text-lg font-semibold text-primary tabular-nums">{money(tx.total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableShell>
  );
}

export function Timeline({ tx }: { tx: CreditTransaction }) {
  return (
    <ol className="relative space-y-5 border-l border-primary/20 pl-6">
      {[...tx.history].reverse().map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-primary/50">
            <CircleDot className="h-2.5 w-2.5 text-primary" />
          </span>
          <div className="text-sm font-medium">{h.action}</div>
          <div className="text-xs text-muted-foreground">
            {h.by} · {dateTime(h.at)}
          </div>
          {h.note && <div className="mt-1 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{h.note}</div>}
        </li>
      ))}
    </ol>
  );
}

function Notice({ tone, icon, title, children }: { tone: "danger" | "success" | "info" | "warning"; icon: ReactNode; title: string; children: ReactNode }) {
  const cls = {
    danger: "border-destructive/30 bg-destructive/5 text-destructive",
    success: "border-success/30 bg-success/5 text-success",
    info: "border-info/30 bg-info/5 text-info",
    warning: "border-warning/30 bg-warning/5 text-warning",
  }[tone];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${cls}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-foreground/80">{children}</div>
      </div>
    </div>
  );
}

export function TransactionNotices({ tx }: { tx: CreditTransaction }) {
  return (
    <div className="space-y-3 empty:hidden">
      {tx.status === "disputed" && tx.disputeReason && (
        <Notice tone="danger" icon={<AlertTriangle className="h-4 w-4" />} title="Disputed by guest">
          “{tx.disputeReason}”
        </Notice>
      )}
      {tx.exceedsLimit && !tx.exceptionApproval && tx.status !== "rejected" && tx.status !== "cancelled" && (
        <Notice tone="warning" icon={<AlertTriangle className="h-4 w-4" />} title="Exceeds available credit">
          Over the guest's available credit by <b>{money(tx.excessAmount)}</b>. Requires exceptional Finance Manager approval.
        </Notice>
      )}
      {tx.exceptionApproval && (
        <Notice tone="info" icon={<ShieldCheck className="h-4 w-4" />} title="Exceptional approval recorded">
          Approved by {tx.exceptionApproval.approvedBy} on {dateTime(tx.exceptionApproval.at)} — “{tx.exceptionApproval.reason}”
        </Notice>
      )}
      {tx.status === "rejected" && tx.rejectionReason && (
        <Notice tone="danger" icon={<XCircle className="h-4 w-4" />} title="Rejected by Finance">
          “{tx.rejectionReason}”
        </Notice>
      )}
      {tx.status === "approved" && (
        <Notice tone="success" icon={<BadgeCheck className="h-4 w-4" />} title="Approved and added to the guest's debt">
          {tx.financeDecision ? `By ${tx.financeDecision.by} on ${dateTime(tx.financeDecision.at)}.` : "Approved."}
        </Notice>
      )}
    </div>
  );
}

export function TransactionDetail({ tx, aside }: { tx: CreditTransaction; aside?: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Transaction</div>
              <div className="font-display text-3xl font-semibold">{tx.code}</div>
            </div>
            <TxStatusBadge status={tx.status} />
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            <Field label="Guest" value={tx.guestName} />
            <Field label="Consumption date" value={date(tx.consumptionDate)} />
            <Field label="Recorded by" value={tx.createdBy} />
            <Field label="Recorded at" value={dateTime(tx.createdAt)} />
            <Field label="Revision" value={tx.revision} />
            <Field
              label="Confirmation deadline"
              value={tx.confirmationDeadline && tx.status === "pending_guest" ? `${dateTime(tx.confirmationDeadline)} (${fromNow(tx.confirmationDeadline)})` : "—"}
            />
            <Field
              label="Guest confirmation"
              value={
                tx.confirmation ? (
                  <span>
                    <Badge variant="muted" className="mr-1 uppercase">
                      {tx.confirmation.method}
                    </Badge>
                    {dateTime(tx.confirmation.at)}
                    {tx.confirmation.assistedBy && <span className="block text-xs text-muted-foreground">Assisted by {tx.confirmation.assistedBy}</span>}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Field label="Total" value={<span className="text-primary">{money(tx.total)}</span>} />
          </div>
        </Panel>
        <TransactionNotices tx={tx} />
        <div>
          <SectionTitle title="Services" />
          <ItemsTable tx={tx} />
        </div>
      </div>
      <div className="space-y-6">
        {aside}
        <Panel>
          <SectionTitle title="Audit trail" />
          <Timeline tx={tx} />
        </Panel>
      </div>
    </div>
  );
}

/** Compact table of transactions with links to a details page. */
export function TransactionsTable({
  rows,
  detailTo,
  showGuest = true,
  actions,
  empty = "No transactions found.",
}: {
  rows: CreditTransaction[];
  detailTo?: "/cashier/transactions/$id" | "/finance/transactions/$id";
  showGuest?: boolean;
  actions?: (tx: CreditTransaction) => ReactNode;
  empty?: string;
}) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            {showGuest && <TableHead>Guest</TableHead>}
            <TableHead className="min-w-[220px]">Services</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            {actions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-semibold">
                {detailTo ? (
                  <Link to={detailTo} params={{ id: t.id }} className="text-primary hover:underline">
                    {t.code}
                  </Link>
                ) : (
                  t.code
                )}
              </TableCell>
              {showGuest && <TableCell className="whitespace-nowrap">{t.guestName}</TableCell>}
              <TableCell className="text-sm text-muted-foreground">{itemsSummary(t)}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{date(t.consumptionDate)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(t.total)}</TableCell>
              <TableCell>
                <TxStatusBadge status={t.status} />
              </TableCell>
              {actions && <TableCell className="text-right">{actions(t)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableShell>
  );
}
