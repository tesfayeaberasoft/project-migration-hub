import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Spinner } from "./States";

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  pending,
  onSubmit,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[92vh] overflow-y-auto border-primary/20 bg-popover", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          id="form-dialog"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {children}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="form-dialog" disabled={pending}>
            {pending && <Spinner className="h-4 w-4 text-current" />} {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
  disabled,
  className,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...(placeholder ? { placeholder } : {})}
        {...(disabled ? { disabled } : {})}
        {...(inputMode ? { inputMode } : {})}
        className="bg-surface"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
