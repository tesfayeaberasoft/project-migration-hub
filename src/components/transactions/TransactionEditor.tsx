import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Lock, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Spinner } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { excessOverAvailable, lineTotal, roundMoney } from "@/lib/credit";
import { money } from "@/lib/format";
import { q } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { TransactionLineInput } from "@/services/transactions.service";
import type { HotelService, ServiceCategory, TransactionItem } from "@/types";

interface Line {
  key: number;
  serviceId: string;
  quantity: string;
  special: boolean;
  requestedPrice: string;
  priceReason: string;
}

const CATS: { id: ServiceCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "drinks", label: "Drinks" },
  { id: "accommodation", label: "Accommodation" },
  { id: "other", label: "Other services" },
];

let seq = 1;
const blank = (): Line => ({ key: seq++, serviceId: "", quantity: "1", special: false, requestedPrice: "", priceReason: "" });

export interface EditorValue {
  consumptionDate: string;
  items: TransactionLineInput[];
  note?: string | undefined;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Service lines with catalog-locked prices. A different price can only be requested
 * (with a reason) and needs Finance Manager approval before the guest sees the transaction.
 */
export function TransactionEditor({
  available,
  initialItems,
  initialDate,
  submitLabel,
  pending,
  requireNote = false,
  disabled = false,
  onSubmit,
}: {
  /** Guest's available credit, excluding this transaction's own reservation. */
  available?: number | undefined;
  initialItems?: TransactionItem[] | undefined;
  initialDate?: string | undefined;
  submitLabel: string;
  pending?: boolean;
  requireNote?: boolean;
  disabled?: boolean;
  onSubmit: (v: EditorValue) => void;
}) {
  const { data: services = [] } = useQuery(q.services());
  const [date, setDate] = useState(initialDate ? initialDate.slice(0, 10) : today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>(() =>
    initialItems?.length
      ? initialItems.map((i) => ({
          key: seq++,
          serviceId: i.serviceId,
          quantity: String(i.quantity),
          special: Boolean(i.priceRequest && i.priceRequest.status !== "rejected"),
          requestedPrice: i.priceRequest ? String(i.priceRequest.requestedPrice) : "",
          priceReason: i.priceRequest?.reason ?? "",
        }))
      : [blank()],
  );

  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const priced = lines.map((l) => {
    const svc = byId.get(l.serviceId);
    const qty = Number(l.quantity) || 0;
    const special = l.special && Number(l.requestedPrice) > 0 ? Number(l.requestedPrice) : null;
    const unit = special ?? svc?.price ?? 0;
    return { line: l, svc, qty, unit, total: lineTotal(qty, unit) };
  });
  const total = roundMoney(priced.reduce((a, p) => a + p.total, 0));
  const excess = available !== undefined ? excessOverAvailable(total, available) : 0;
  const hasSpecial = priced.some((p) => p.line.special);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = () => {
    setError(null);
    if (priced.some((p) => !p.svc)) return setError("Choose a service for every line.");
    if (priced.some((p) => !(p.qty > 0))) return setError("Every quantity must be greater than zero.");
    if (priced.some((p) => p.line.special && (!(Number(p.line.requestedPrice) > 0) || p.line.priceReason.trim().length < 5)))
      return setError("Special prices need a valid price and a reason (at least 5 characters).");
    if (requireNote && note.trim().length < 5) return setError("Describe the correction you made (at least 5 characters).");
    onSubmit({
      consumptionDate: new Date(`${date}T12:00:00`).toISOString(),
      note: note.trim() || undefined,
      items: priced.map((p) => ({
        serviceId: p.line.serviceId,
        quantity: p.qty,
        ...(p.line.special ? { requestedPrice: Number(p.line.requestedPrice), priceReason: p.line.priceReason.trim() } : {}),
      })),
    });
  };

  return (
    <div className={cn("space-y-6", disabled && "pointer-events-none opacity-50")}>
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="consumption-date">Consumption date</Label>
          <Input id="consumption-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="bg-surface" />
        </div>
        <div className="flex items-end text-xs text-muted-foreground">
          <Lock className="mr-1.5 h-3.5 w-3.5 text-primary" /> Prices come from the service catalog and cannot be edited. Each consumption date is recorded as its own transaction.
        </div>
      </div>

      <div className="space-y-3">
        {priced.map(({ line, svc, unit, total: lt }, idx) => (
          <div key={line.key} className="rounded-xl border bg-surface p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_110px_150px_150px_40px] md:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Service {idx + 1}</Label>
                <Select value={line.serviceId} onValueChange={(v) => update(line.key, { serviceId: v })}>
                  <SelectTrigger className="h-10 bg-background" aria-label={`Service ${idx + 1}`}>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATS.map((c) => {
                      const list = services.filter((s: HotelService) => s.category === c.id && s.available);
                      if (!list.length) return null;
                      return (
                        <SelectGroup key={c.id}>
                          <SelectLabel className="text-primary">{c.label}</SelectLabel>
                          {list.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} — {money(s.price)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <Input type="number" min={1} step={1} inputMode="numeric" value={line.quantity} onChange={(e) => update(line.key, { quantity: e.target.value })} className="h-10 bg-background" aria-label={`Quantity ${idx + 1}`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Unit price (catalog)</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> {svc ? money(svc.price) : "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Line total</Label>
                <div className="flex h-10 items-center px-1 font-semibold tabular-nums">{money(lt)}</div>
              </div>
              <Button variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))} aria-label="Remove line">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-dashed pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={line.special} onCheckedChange={(v) => update(line.key, { special: v })} disabled={!svc} />
                Request a special price (needs Finance approval)
              </label>
              {line.special && (
                <div className="grid w-full gap-3 sm:grid-cols-[160px_1fr]">
                  <Input type="number" min={1} placeholder="Requested price" value={line.requestedPrice} onChange={(e) => update(line.key, { requestedPrice: e.target.value })} className="bg-background" />
                  <Input placeholder="Reason for the special price" value={line.priceReason} onChange={(e) => update(line.key, { priceReason: e.target.value })} className="bg-background" />
                  {unit !== svc?.price && <div className="text-xs text-info sm:col-span-2">Line will use {money(unit)} once Finance approves; otherwise the catalog price applies.</div>}
                </div>
              )}
            </div>
          </div>
        ))}
        <Button variant="gold" onClick={() => setLines((ls) => [...ls, blank()])}>
          <Plus className="h-4 w-4" /> Add another service
        </Button>
      </div>

      {requireNote && (
        <div className="space-y-2">
          <Label htmlFor="correction-note">
            What did you correct? <span className="text-destructive">*</span>
          </Label>
          <Textarea id="correction-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Removed one Special Kitfo and the avocado juice as the guest reported." />
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-gold-soft p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Transaction total</div>
          <div className="font-display text-3xl font-semibold text-primary tabular-nums">{money(total)}</div>
          {available !== undefined && (
            <div className={cn("mt-1 flex items-center gap-1.5 text-xs", excess > 0 ? "text-warning" : "text-success")}>
              {excess > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {excess > 0
                ? `Exceeds available credit (${money(available)}) by ${money(excess)} — will need exceptional Finance approval.`
                : `Within available credit of ${money(available)}.`}
            </div>
          )}
          {hasSpecial && <div className="mt-1 text-xs text-info">Includes a special price request — Finance approves it before the guest is asked to confirm.</div>}
        </div>
        <Button size="lg" onClick={submit} disabled={pending || disabled || total <= 0}>
          {pending && <Spinner className="h-4 w-4 text-current" />} {submitLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
