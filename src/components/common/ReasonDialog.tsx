import { useEffect, useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "./States";

/** Modal that requires a written reason before the action can be submitted. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label = "Reason",
  placeholder = "Explain the reason…",
  confirmLabel = "Submit",
  confirmVariant = "default",
  required = true,
  minLength = 5,
  pending,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  required?: boolean;
  minLength?: number;
  pending?: boolean;
  onSubmit: (reason: string) => void;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);
  const invalid = required && reason.trim().length < minLength;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <form
          id="reason-form"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!invalid) onSubmit(reason.trim());
          }}
          className="space-y-2"
        >
          <Label htmlFor="reason">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea id="reason" autoFocus rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} />
          {touched && invalid && <p className="text-xs text-destructive">Please write at least {minLength} characters.</p>}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button form="reason-form" type="submit" variant={confirmVariant} disabled={pending}>
            {pending && <Spinner className="h-4 w-4 text-current" />} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
