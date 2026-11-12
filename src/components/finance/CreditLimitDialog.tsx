import { useState } from "react";
import { FormDialog, TextField } from "@/components/common/FormDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { money } from "@/lib/format";
import { guestsService } from "@/services/guests.service";
import type { GuestAccount } from "@/types";

export function CreditLimitDialog({ account, onClose }: { account: GuestAccount; onClose: () => void }) {
  const [limit, setLimit] = useState(String(account.creditLimit));
  const [reason, setReason] = useState("");
  const save = useAction(() => guestsService.setCreditLimit(account.id, Number(limit), reason.trim()), {
    success: `Credit limit updated for ${account.fullName}.`,
    onSuccess: onClose,
  });
  const next = Number(limit);
  const below = Number.isFinite(next) && next < account.outstandingDebt + account.pendingReservations;
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Change credit limit"
      description={`${account.fullName} · current limit ${money(account.creditLimit)} · outstanding ${money(account.outstandingDebt)}`}
      submitLabel="Save limit"
      pending={save.isPending}
      onSubmit={() => save.mutate(undefined)}
    >
      <TextField id="cl-limit" label="New credit limit (ETB)" type="number" required value={limit} onChange={setLimit} />
      {below && <p className="text-xs text-warning">This is below what the guest already owes or has reserved, so they will have no available credit.</p>}
      <div className="space-y-2">
        <Label htmlFor="cl-reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea id="cl-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the limit changing?" />
      </div>
    </FormDialog>
  );
}
