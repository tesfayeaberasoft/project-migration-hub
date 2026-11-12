import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, MessageSquareText, Pencil, XCircle } from "lucide-react";
import { useState } from "react";
import { CreditSummary } from "@/components/common/CreditSummary";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { Spinner } from "@/components/common/States";
import { TransactionEditor, type EditorValue } from "@/components/transactions/TransactionEditor";
import { TransactionDetail } from "@/components/transactions/TransactionParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAction } from "@/hooks/use-action";
import { availableCredit } from "@/lib/credit";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { transactionsService } from "@/services/transactions.service";
import type { CreditTransaction } from "@/types";

export const Route = createFileRoute("/_portal/cashier/transactions/$id")({
  head: () => pageHead("Transaction Details", "Confirm, correct or cancel a credit transaction."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q.transaction(params.id)),
  component: CashierTransactionPage,
});

const CORRECTABLE = ["disputed", "pending_guest", "pending_price_approval"];

function CashierTransactionPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(q.transaction(id));
  const { transaction: tx, account } = data;
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const correct = useAction((v: EditorValue) => transactionsService.correct(tx.id, v), { success: "Correction saved and resubmitted.", onSuccess: () => setEditing(false) });
  const cancel = useAction((reason: string) => transactionsService.cancel(tx.id, reason), { success: "Transaction cancelled.", onSuccess: () => setCancelling(false) });

  const canCorrect = CORRECTABLE.includes(tx.status);
  const canCancel = canCorrect || tx.status === "expired";
  // The guest's available credit without this transaction's own reservation.
  const reservedByThis = ["pending_guest", "disputed", "pending_price_approval"].includes(tx.status) ? tx.total : 0;
  const availableForEdit = account ? availableCredit(account.creditLimit, account.outstandingDebt, Math.max(0, account.pendingReservations - reservedByThis)) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Credit desk"
        title={`Transaction ${tx.code}`}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/cashier/history">
              <ArrowLeft className="h-4 w-4" /> All transactions
            </Link>
          </Button>
        }
      />
      {editing ? (
        <Panel>
          <SectionTitle
            title="Correct and resubmit"
            action={
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Close
              </Button>
            }
          />
          <TransactionEditor
            initialItems={tx.items}
            initialDate={tx.consumptionDate}
            available={availableForEdit}
            requireNote
            pending={correct.isPending}
            submitLabel="Save correction & resend"
            onSubmit={(v) => correct.mutate(v)}
          />
        </Panel>
      ) : (
        <TransactionDetail
          tx={tx}
          aside={
            <>
              {tx.status === "pending_guest" && <InHotelConfirm tx={tx} />}
              {(canCorrect || canCancel) && (
                <Panel>
                  <SectionTitle title="Cashier actions" />
                  <div className="flex flex-col gap-2">
                    {canCorrect && (
                      <Button variant="gold" onClick={() => setEditing(true)}>
                        <Pencil className="h-4 w-4" /> Correct transaction
                      </Button>
                    )}
                    {canCancel && (
                      <Button variant="outline" onClick={() => setCancelling(true)}>
                        <XCircle className="h-4 w-4" /> Cancel transaction
                      </Button>
                    )}
                  </div>
                </Panel>
              )}
              {account && (
                <Panel>
                  <SectionTitle title="Guest credit" />
                  <CreditSummary account={account} compact className="border-0 bg-transparent p-0" />
                </Panel>
              )}
            </>
          }
        />
      )}
      <ReasonDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={`Cancel ${tx.code}?`}
        description="The guest will no longer be asked to confirm and the credit reservation is released."
        confirmLabel="Cancel transaction"
        confirmVariant="destructive"
        pending={cancel.isPending}
        onSubmit={(r) => cancel.mutate(r)}
      />
    </>
  );
}

function InHotelConfirm({ tx }: { tx: CreditTransaction }) {
  const [method, setMethod] = useState<"pin" | "otp">("pin");
  const [code, setCode] = useState("");
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const sendOtp = useAction(() => transactionsService.sendOtp(tx.id), {
    success: (r) => `Code sent to ${r.sentTo}.`,
    onSuccess: (r) => setOtpInfo(r.demoCode ? `Sent to ${r.sentTo}. Demo code: ${r.demoCode}` : `Sent to ${r.sentTo}.`),
  });
  const confirm = useAction(() => transactionsService.confirmInHotel(tx.id, method, code.trim()), { success: "Guest confirmation recorded." });

  return (
    <Panel className="border-primary/30 bg-gold-soft">
      <SectionTitle title="Confirm in hotel" />
      <p className="mb-4 text-sm text-muted-foreground">If the guest is at the desk, they can confirm now with their PIN or a code sent by SMS.</p>
      <Tabs
        value={method}
        onValueChange={(v) => {
          setMethod(v as "pin" | "otp");
          setCode("");
        }}
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pin" className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Guest PIN
          </TabsTrigger>
          <TabsTrigger value="otp" className="gap-1.5">
            <MessageSquareText className="h-3.5 w-3.5" /> SMS code
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) confirm.mutate(undefined);
        }}
      >
        {method === "otp" && (
          <div className="space-y-2">
            <Button type="button" variant="outline" className="w-full" onClick={() => sendOtp.mutate(undefined)} disabled={sendOtp.isPending}>
              {sendOtp.isPending && <Spinner className="h-4 w-4 text-current" />} {otpInfo ? "Send a new code" : "Send code to guest's phone"}
            </Button>
            {otpInfo && <p className="text-xs text-info">{otpInfo}</p>}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="confirm-code">{method === "pin" ? "Guest enters their PIN" : "One-time code"}</Label>
          <Input
            id="confirm-code"
            type={method === "pin" ? "password" : "text"}
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="bg-background text-center text-lg tracking-[0.5em]"
          />
        </div>
        <Button type="submit" className="w-full" disabled={!code.trim() || confirm.isPending}>
          {confirm.isPending && <Spinner className="h-4 w-4 text-current" />} Confirm for guest
        </Button>
      </form>
    </Panel>
  );
}
