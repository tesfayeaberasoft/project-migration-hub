import { Check, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { money } from "@/lib/format";
import { transactionsService } from "@/services/transactions.service";
import type { CreditTransaction } from "@/types";

/** Approve / reject buttons for a transaction awaiting Finance. Exceptions need a written reason to approve. */
export function DecisionActions({ tx, size = "sm", block = false }: { tx: CreditTransaction; size?: "sm" | "default"; block?: boolean }) {
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const isException = tx.status === "pending_exception";
  const approve = useAction((reason?: string) => transactionsService.approve(tx.id, reason), {
    success: `${tx.code} approved and added to ${tx.guestName}'s debt.`,
    onSuccess: () => setMode(null),
  });
  const reject = useAction((reason: string) => transactionsService.reject(tx.id, reason), { success: `${tx.code} rejected.`, onSuccess: () => setMode(null) });

  if (tx.status !== "pending_finance" && tx.status !== "pending_exception") return null;
  const cls = block ? "w-full" : "";
  return (
    <>
      <div className={block ? "flex flex-col gap-2" : "flex justify-end gap-2"}>
        <Button size={size} variant="success" className={cls} onClick={() => setMode("approve")} disabled={approve.isPending}>
          {isException ? <ShieldCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />} {isException ? "Approve exception" : "Approve"}
        </Button>
        <Button size={size} variant="outline" className={cls} onClick={() => setMode("reject")} disabled={reject.isPending}>
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
      {isException ? (
        <ReasonDialog
          open={mode === "approve"}
          onOpenChange={(o) => !o && setMode(null)}
          title={`Approve exceptional credit for ${tx.code}`}
          description={`${tx.guestName} goes ${money(tx.excessAmount)} over their available credit. Record why this is allowed.`}
          label="Reason for the exception"
          confirmLabel="Approve exception"
          confirmVariant="success"
          pending={approve.isPending}
          onSubmit={(r) => approve.mutate(r)}
        />
      ) : (
        <ConfirmDialog
          open={mode === "approve"}
          onOpenChange={(o) => !o && setMode(null)}
          title={`Approve ${tx.code}?`}
          description={`${money(tx.total)} will be added to ${tx.guestName}'s outstanding debt.`}
          confirmLabel="Approve"
          onConfirm={() => approve.mutate(undefined)}
        />
      )}
      <ReasonDialog
        open={mode === "reject"}
        onOpenChange={(o) => !o && setMode(null)}
        title={`Reject ${tx.code}`}
        description="The credit reservation is released and the cashier sees your reason."
        label="Rejection reason"
        confirmLabel="Reject transaction"
        confirmVariant="destructive"
        pending={reject.isPending}
        onSubmit={(r) => reject.mutate(r)}
      />
    </>
  );
}
