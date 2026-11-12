import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { History, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { FormDialog, TextField } from "@/components/common/FormDialog";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Panel";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { dateTime, money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { catalogService } from "@/services/catalog.service";
import type { HotelService, ServiceCategory } from "@/types";

export const Route = createFileRoute("/_portal/admin/services")({
  head: () => pageHead("Service Catalog", "Hotel services and prices. Price changes need Finance approval."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.services()),
  component: ServicesPage,
});

const CATS: { id: ServiceCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "drinks", label: "Drinks" },
  { id: "accommodation", label: "Accommodation" },
  { id: "other", label: "Other services" },
];

function ServicesPage() {
  const { data } = useSuspenseQuery(q.services());
  const [editing, setEditing] = useState<HotelService | "new" | null>(null);
  const [history, setHistory] = useState<HotelService | null>(null);
  const [search, setSearch] = useState("");
  const list = data.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Service catalog"
        description="Cashiers can only charge catalog prices. A new price takes effect once the Finance Manager approves it."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add service
          </Button>
        }
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search services" className="mb-6 max-w-sm" />
      {!list.length && <EmptyState title="No services found" />}
      {CATS.map((c) => {
        const items = list.filter((s) => s.category === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} className="mb-8">
            <SectionTitle title={c.label} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <Panel key={s.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant={s.available ? "success" : "muted"}>{s.available ? "Available" : "Unavailable"}</Badge>
                  </div>
                  <Field className="mt-4" label="Current price" value={<span className="font-display text-xl text-primary">{money(s.price)}</span>} />
                  {s.proposedPrice !== undefined && (
                    <Badge variant="info" className="mt-3 w-fit whitespace-normal">
                      {money(s.proposedPrice)} awaiting Finance approval
                    </Badge>
                  )}
                  <div className="mt-auto flex gap-2 pt-4">
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setHistory(s)}>
                      <History className="h-3.5 w-3.5" /> Price history
                    </Button>
                  </div>
                </Panel>
              ))}
            </div>
          </section>
        );
      })}
      {editing && <ServiceDialog service={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <Dialog open={Boolean(history)} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-primary/20 bg-popover">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Price history</DialogTitle>
            <DialogDescription>{history?.name}</DialogDescription>
          </DialogHeader>
          <ul className="divide-y">
            {[...(history?.priceHistory ?? [])].reverse().map((h, i) => (
              <li key={`${h.effectiveFrom}-${i}`} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm">{dateTime(h.effectiveFrom)}</div>
                  <div className="text-xs text-muted-foreground">{h.approvedBy}</div>
                </div>
                <div className="font-semibold tabular-nums">{money(h.price)}</div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServiceDialog({ service, onClose }: { service: HotelService | null; onClose: () => void }) {
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState<ServiceCategory>(service?.category ?? "food");
  const [available, setAvailable] = useState(service?.available ?? true);
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [reason, setReason] = useState("");
  const changing = Boolean(service && Number(price) !== service.price);
  const save = useAction(
    () =>
      service
        ? catalogService.update(service.id, { name: name.trim(), category, available, ...(changing ? { price: Number(price), priceReason: reason.trim() } : {}) })
        : catalogService.create({ name: name.trim(), category, available, price: Number(price) }),
    { success: changing ? "Saved. The new price was sent to Finance for approval." : "Service saved.", onSuccess: onClose },
  );
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={service ? "Edit service" : "Add service"}
      submitLabel={service ? "Save changes" : "Add service"}
      pending={save.isPending}
      onSubmit={() => save.mutate(undefined)}
    >
      <TextField id="svc-name" label="Service name" required value={name} onChange={setName} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="svc-cat">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ServiceCategory)}>
            <SelectTrigger id="svc-cat" className="bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TextField id="svc-price" label={service ? "Price (ETB)" : "Initial price (ETB)"} required type="number" value={price} onChange={setPrice} />
      </div>
      {changing && (
        <TextField
          id="svc-reason"
          label="Reason for the price change"
          required
          value={reason}
          onChange={setReason}
          hint="The current price stays in effect until the Finance Manager approves."
        />
      )}
      <label className="flex items-center justify-between gap-4 rounded-lg border bg-surface p-3 text-sm">
        Available to cashiers
        <Switch checked={available} onCheckedChange={setAvailable} />
      </label>
    </FormDialog>
  );
}
