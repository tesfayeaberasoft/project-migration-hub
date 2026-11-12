import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Bell, Download, Eye, Flag, Hourglass } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CreditSummary } from "@/components/common/CreditSummary";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Panel";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { EmptyState, Spinner } from "@/components/common/States";
import { HistoricalStatusBadge, TX_STATUS_LABEL, TxStatusBadge } from "@/components/common/StatusBadge";
import { PaymentMethodBadge, PaymentsTable, ReceiptButton } from "@/components/finance/PaymentParts";
import { ItemsTable, TransactionDetail, TransactionsTable } from "@/components/transactions/TransactionParts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";
import { date, dateTime, fromNow, money } from "@/lib/format";
import { downloadStatementPdf } from "@/lib/pdf";
import { q } from "@/lib/queries";
import { errorMessage } from "@/services/http";
import { guestSelfService } from "@/services/finance.service";
import { transactionsService } from "@/services/transactions.service";
import type { CreditTransaction, TransactionStatus } from "@/types";
import { toast } from "sonner";

const byNewest = <T,>(key: (x: T) => string) => (a: T, b: T) => Date.parse(key(b)) - Date.parse(key(a));

export function GuestDashboard() {
  const { data } = useSuspenseQuery(q.guestDashboard());
  const read = useAction(() => guestSelfService.markNotificationsRead());
  const unread = data.notifications.filter((n) => !n.read).length;
  const first = data.account.fullName.split(" ")[0] ?? data.account.fullName;

  return (
    <>
      <PageHeader eyebrow="My account" title={`Welcome, ${first}`} description="Your credit position at Haroni Hotel, charges waiting for you, and recent activity." />
      <CreditSummary account={data.account} />
      {data.pending.length > 0 ? (
        <Panel className="mt-6 border-primary/35 bg-gold-soft" delay={60}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Hourglass className="mt-1 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {data.pending.length} charge{data.pending.length === 1 ? "" : "s"} waiting for your confirmation
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Confirm only services you received. Dispute anything that is wrong.</p>
              </div>
            </div>
            <Button asChild>
              <Link to="/guest/pending">Review now</Link>
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel className="mt-6" delay={60}>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <BadgeCheck className="h-5 w-5 text-success" /> Nothing is waiting for your confirmation.
          </div>
        </Panel>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel delay={120} className="min-w-0">
          <SectionTitle
            title="Recent activity"
            action={
              <Button variant="link" size="sm" asChild>
                <Link to="/guest/history">All transactions</Link>
              </Button>
            }
          />
          {data.activity.length ? (
            <ul className="divide-y">
              {[...data.activity].sort(byNewest((a) => a.at)).map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{dateTime(a.at)}</p>
                  </div>
                  <span className={cn("shrink-0 font-semibold tabular-nums", a.kind === "payment" ? "text-success" : "text-foreground")}>
                    {a.kind === "payment" ? "−" : ""}
                    {money(a.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No activity yet" />
          )}
        </Panel>
        <Panel delay={180} className="min-w-0">
          <SectionTitle
            title="Notifications"
            action={
              <Button variant="ghost" size="sm" disabled={!unread || read.isPending} onClick={() => read.mutate(undefined)}>
                Mark all read
              </Button>
            }
          />
          {data.notifications.length ? (
            <ul className="space-y-3">
              {[...data.notifications].sort(byNewest((n) => n.at)).map((n) => (
                <li key={n.id} className={cn("rounded-lg border p-3", n.read ? "bg-surface" : "border-primary/30 bg-primary/5")}>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {!n.read && <Bell className="h-3.5 w-3.5 text-primary" />}
                    {n.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fromNow(n.at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No notifications" />
          )}
        </Panel>
      </div>
    </>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function Countdown({ deadline, now }: { deadline?: string | undefined; now: number }) {
  if (!deadline) return null;
  const ms = Date.parse(deadline) - now;
  if (ms <= 0) return <span className="text-sm font-medium text-destructive">Confirmation time has passed</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <span className={cn("text-sm font-medium", h < 6 ? "text-warning" : "text-muted-foreground")}>
      {h > 0 ? `${h}h ${m}m` : `${m}m`} left to respond · by {dateTime(deadline)}
    </span>
  );
}

export function GuestPending() {
  const { data: rows } = useSuspenseQuery(q.transactions({ status: "pending_guest" }));
  const now = useNow();
  const [confirming, setConfirming] = useState<CreditTransaction | null>(null);
  const [disputing, setDisputing] = useState<CreditTransaction | null>(null);
  const confirm = useAction((id: string) => transactionsService.confirm(id), { success: "Thank you — charge confirmed.", onSuccess: () => setConfirming(null) });
  const dispute = useAction((v: { id: string; reason: string }) => transactionsService.dispute(v.id, v.reason), { success: "Dispute sent to the cashier.", onSuccess: () => setDisputing(null) });

  return (
    <>
      <PageHeader eyebrow="Transactions" title="Pending confirmation" description="Check each charge carefully. Confirm only services you received; dispute anything that is wrong." />
      {!rows.length && <EmptyState icon={<BadgeCheck className="h-5 w-5" />} title="All caught up" description="New charges from the hotel will appear here for you to confirm." />}
      <div className="space-y-6">
        {rows.map((tx, i) => (
          <Panel key={tx.id} delay={i * 50}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-display text-2xl font-semibold">{tx.code}</div>
                <div className="text-sm text-muted-foreground">
                  Services on {date(tx.consumptionDate)} · recorded by {tx.createdBy}
                </div>
              </div>
              <TxStatusBadge status={tx.status} />
            </div>
            <ItemsTable tx={tx} />
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Countdown deadline={tx.confirmationDeadline} now={now} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setDisputing(tx)}>
                  <Flag className="h-4 w-4" /> Dispute
                </Button>
                <Button className="flex-1 sm:flex-none" onClick={() => setConfirming(tx)}>
                  <BadgeCheck className="h-4 w-4" /> Confirm {money(tx.total)}
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Confirm ${confirming?.code ?? ""}?`}
        description={`You confirm you received these services, totalling ${confirming ? money(confirming.total) : ""}. The Finance Manager then approves it and it is added to your balance.`}
        confirmLabel="Yes, confirm"
        onConfirm={() => confirming && !confirm.isPending && confirm.mutate(confirming.id)}
      />
      <ReasonDialog
        open={Boolean(disputing)}
        onOpenChange={(o) => !o && setDisputing(null)}
        title={`Dispute ${disputing?.code ?? ""}`}
        description="Tell the hotel what is wrong — for example a service you did not take or a wrong quantity."
        placeholder="What is wrong with this charge?"
        confirmLabel="Send dispute"
        confirmVariant="destructive"
        pending={dispute.isPending}
        onSubmit={(reason) => disputing && dispute.mutate({ id: disputing.id, reason })}
      />
    </>
  );
}

export function GuestHistory() {
  const { data } = useSuspenseQuery(q.transactions());
  const [status, setStatus] = useState<TransactionStatus | "all">("all");
  const [selected, setSelected] = useState<CreditTransaction | null>(null);
  const rows = data.filter((t) => status === "all" || t.status === status).sort(byNewest((t) => t.createdAt));

  return (
    <>
      <PageHeader eyebrow="Transactions" title="Transaction history" description="Every charge recorded on your account and what happened to it." />
      <Select value={status} onValueChange={(v) => setStatus(v as TransactionStatus | "all")}>
        <SelectTrigger className="mb-4 w-full bg-surface sm:w-60" aria-label="Filter by status">
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
      <TransactionsTable
        rows={rows}
        showGuest={false}
        empty="No transactions match this filter."
        actions={(t) => (
          <Button variant="ghost" size="sm" onClick={() => setSelected(t)} aria-label={`View ${t.code}`}>
            <Eye className="h-4 w-4" /> View
          </Button>
        )}
      />
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-primary/20 bg-background sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Transaction details</DialogTitle>
            <DialogDescription>Services, confirmation and review history.</DialogDescription>
          </DialogHeader>
          {selected && <TransactionDetail tx={selected} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GuestDebt() {
  const { data: s } = useSuspenseQuery(q.myStatement());
  const { data: settings } = useSuspenseQuery(q.settings());
  const [busy, setBusy] = useState(false);
  const a = s.account;
  const approved = s.transactions.filter((t) => t.status === "approved");

  const download = async () => {
    setBusy(true);
    try {
      await downloadStatementPdf(s, settings);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Debt & payments"
        title="Debt details"
        description="How your outstanding balance is made up."
        actions={
          <Button onClick={() => void download()} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4 text-current" /> : <Download className="h-4 w-4" />} Download statement (PDF)
          </Button>
        }
      />
      <Panel>
        <SectionTitle title="Balance breakdown" />
        <dl className="divide-y text-sm">
          {[
            ["Opening balance (earlier records)", money(a.historicalDebt)],
            ["Approved charges", money(a.approvedCredit)],
            ["Payments received", `− ${money(a.totalPayments)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium tabular-nums">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-4">
            <dt className="font-semibold">Outstanding balance</dt>
            <dd className="font-display text-2xl font-semibold text-primary tabular-nums">{money(a.outstandingDebt)}</dd>
          </div>
        </dl>
        {a.pendingReservations > 0 && (
          <p className="text-xs text-muted-foreground">{money(a.pendingReservations)} in charges still awaiting confirmation or approval is not included yet.</p>
        )}
      </Panel>
      <CreditSummary account={a} className="mt-6" />
      {s.historical.length > 0 && (
        <div className="mt-8">
          <SectionTitle title="Opening balance records" />
          <div className="space-y-3">
            {s.historical.map((h) => (
              <Panel key={h.id} className="p-4 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{h.sourceReference}</div>
                    <div className="text-xs text-muted-foreground">Original date {date(h.originalDate)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <HistoricalStatusBadge status={h.status} />
                    <span className="font-semibold tabular-nums">{money(h.amount)}</span>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8">
        <SectionTitle title="Approved charges" />
        <TransactionsTable rows={approved} showGuest={false} empty="No approved charges yet." />
      </div>
      <div className="mt-8">
        <SectionTitle title="Payments" />
        <PaymentsTable rows={s.payments} showGuest={false} guestPhone={a.phone} />
      </div>
    </>
  );
}

export function GuestPayments() {
  const { data: payments } = useSuspenseQuery(q.payments());
  const { data: account } = useSuspenseQuery(q.myAccount());
  const total = payments.filter((p) => p.verified).reduce((s, p) => s + p.amount, 0);
  return (
    <>
      <PageHeader eyebrow="Debt & payments" title="Payment history" description={`${payments.length} payment${payments.length === 1 ? "" : "s"} · ${money(total)} received in total`} />
      <PaymentsTable rows={[...payments].sort(byNewest((p) => p.paidAt))} showGuest={false} guestPhone={account.phone} />
    </>
  );
}

export function GuestReceipts() {
  const { data: payments } = useSuspenseQuery(q.payments());
  const { data: account } = useSuspenseQuery(q.myAccount());
  const verified = payments.filter((p) => p.verified).sort(byNewest((p) => p.paidAt));
  return (
    <>
      <PageHeader eyebrow="Debt & payments" title="Receipts" description="Download an official receipt for every payment the hotel has received." />
      {!verified.length ? (
        <EmptyState title="No receipts yet" description="A receipt appears here once the Finance Manager records your payment." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {verified.map((p, i) => (
            <Panel key={p.id} delay={Math.min(i, 8) * 40} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="break-all font-mono text-xs text-muted-foreground">{p.receiptNumber}</span>
                <PaymentMethodBadge method={p.method} />
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-primary">{money(p.amount)}</div>
              <div className="text-sm text-muted-foreground">{date(p.paidAt)}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Balance before" value={money(p.balanceBefore)} />
                <Field label="Balance after" value={money(p.balanceAfter)} />
              </div>
              <div className="mt-auto pt-5">
                <ReceiptButton payment={p} guestPhone={account.phone} label="Download receipt" variant="gold" size="default" />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
