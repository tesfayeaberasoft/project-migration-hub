import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, CheckCircle2, Landmark } from "lucide-react";
import { useState } from "react";
import { TextField } from "@/components/common/FormDialog";
import { GuestPicker } from "@/components/common/GuestPicker";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Panel";
import { Spinner } from "@/components/common/States";
import { ReceiptButton } from "@/components/finance/PaymentParts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { paymentsService } from "@/services/finance.service";
import type { Payment, PaymentMethod } from "@/types";

export const Route = createFileRoute("/_portal/finance/payments")({
  head: () => pageHead("Record Payment", "Record a guest's cash or bank transfer payment and issue a receipt."),
  validateSearch: (s: Record<string, unknown>): { guestId?: string } => (typeof s["guestId"] === "string" && s["guestId"] ? { guestId: s["guestId"] } : {}),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.guestAccounts()),
  component: RecordPaymentPage,
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function RecordPaymentPage() {
  const search = Route.useSearch();
  const { data: guests } = useSuspenseQuery(q.guestAccounts());
  const [guestId, setGuestId] = useState(search.guestId ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(today());
  const [verified, setVerified] = useState(true);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<Payment | null>(null);
  const account = guests.find((g) => g.id === guestId);

  const record = useAction(
    () =>
      paymentsService.record({
        guestId,
        amount: Number(amount),
        method,
        paidAt: new Date(`${paidAt}T12:00:00`).toISOString(),
        verified,
        ...(method === "bank_transfer" ? { bankName: bankName.trim(), reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    {
      success: (p) => `Payment recorded · receipt ${p.receiptNumber}`,
      onSuccess: (p) => {
        setDone(p);
        setAmount("");
        setReference("");
        setBankName("");
        setNote("");
      },
    },
  );

  if (done) return <PaymentDone payment={done} phone={guests.find((g) => g.id === done.guestId)?.phone} onAnother={() => setDone(null)} />;

  return (
    <>
      <PageHeader eyebrow="Payments" title="Record payment" description="Verified payments reduce the guest's outstanding debt immediately and produce a receipt." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              record.mutate(undefined);
            }}
          >
            <div className="space-y-2">
              <Label>Guest</Label>
              <GuestPicker value={guestId} onChange={(g) => setGuestId(g.id)} includeInactive />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="p-amount" label="Amount (ETB)" type="number" required value={amount} onChange={setAmount} inputMode="decimal" />
              <TextField id="p-date" label="Payment date" type="date" required value={paidAt} onChange={setPaidAt} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["cash", "Cash", Banknote],
                    ["bank_transfer", "Bank transfer", Landmark],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    aria-pressed={method === id}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border bg-surface px-4 py-3 text-sm font-medium transition-colors",
                      method === id ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40",
                    )}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
            {method === "bank_transfer" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="p-bank" label="Bank" value={bankName} onChange={setBankName} placeholder="e.g. Commercial Bank of Ethiopia" />
                <TextField id="p-ref" label="Bank reference number" required value={reference} onChange={setReference} />
              </div>
            )}
            <label className="flex items-center justify-between gap-4 rounded-lg border bg-surface p-4">
              <span>
                <span className="block text-sm font-medium">Money received and verified</span>
                <span className="block text-xs text-muted-foreground">Turn off if a bank transfer has not cleared yet. You can verify it later in Payment History.</span>
              </span>
              <Switch checked={verified} onCheckedChange={setVerified} />
            </label>
            <div className="space-y-2">
              <Label htmlFor="p-note">Note</Label>
              <Textarea id="p-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!guestId || record.isPending}>
              {record.isPending && <Spinner className="h-4 w-4 text-current" />} Record payment
            </Button>
          </form>
        </Panel>
        <Panel delay={60} className="h-fit">
          <SectionTitle title="Guest balance" />
          {account ? (
            <div className="space-y-4">
              <Field label="Outstanding debt" value={<span className="font-display text-2xl text-primary">{money(account.outstandingDebt)}</span>} />
              {Number(amount) > 0 && (
                <Field
                  label="After this payment"
                  value={<span className={Number(amount) > account.outstandingDebt ? "text-destructive" : ""}>{money(Math.max(0, account.outstandingDebt - Number(amount)))}</span>}
                />
              )}
              {Number(amount) > account.outstandingDebt && <p className="text-xs text-destructive">The amount is larger than what the guest owes.</p>}
              <Field label="Credit limit" value={money(account.creditLimit)} />
              <Button variant="link" className="px-0" asChild>
                <Link to="/finance/guests/$id" params={{ id: account.id }}>
                  Open guest account
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Choose a guest to see what they owe.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

function PaymentDone({ payment: p, phone, onAnother }: { payment: Payment; phone?: string | undefined; onAnother: () => void }) {
  return (
    <>
      <PageHeader eyebrow="Payments" title="Payment recorded" />
      <Panel className="max-w-xl border-success/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-6 w-6 text-success" />
          <div>
            <div className="font-display text-3xl font-semibold text-primary">{money(p.amount)}</div>
            <div className="text-sm text-muted-foreground">
              from {p.guestName} · receipt {p.receiptNumber}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Field label="Balance before" value={money(p.balanceBefore)} />
          <Field label="Balance after" value={money(p.balanceAfter)} />
        </div>
        {!p.verified && <p className="mt-4 text-sm text-warning">Awaiting verification — the receipt becomes available once you verify it in Payment History.</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <ReceiptButton payment={p} guestPhone={phone} label="Download receipt" variant="default" size="default" />
          <Button variant="outline" onClick={onAnother}>
            Record another
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/finance/payment-history">Payment history</Link>
          </Button>
        </div>
      </Panel>
    </>
  );
}
