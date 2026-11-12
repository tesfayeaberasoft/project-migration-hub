import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, MoreHorizontal, Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";
import { FormDialog, TextField } from "@/components/common/FormDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { TableShell } from "@/components/common/Panel";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/States";
import { AccountStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { date } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { guestsService, type GuestInput } from "@/services/guests.service";
import type { AccountStatus, Guest } from "@/types";
import { ResetPasswordDialog } from "./users";

export const Route = createFileRoute("/_portal/admin/guests")({
  head: () => pageHead("Guest Accounts", "Register and manage guest accounts for Haroni Hotel credit."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.guestsBasic()),
  component: GuestsPage,
});

const STATUSES: AccountStatus[] = ["active", "inactive", "suspended"];

function GuestsPage() {
  const { data: guests } = useSuspenseQuery(q.guestsBasic());
  const [search, setSearch] = useState("");
  const [status, setStatusFilter] = useState<AccountStatus | "all">("all");
  const [editing, setEditing] = useState<Guest | "new" | null>(null);
  const [resetting, setResetting] = useState<Guest | null>(null);
  const setStatus = useAction((v: { id: string; status: AccountStatus }) => guestsService.setStatus(v.id, v.status), { success: "Guest status updated." });

  const term = search.toLowerCase().replace(/\s/g, "");
  const list = guests.filter(
    (g) => (status === "all" || g.status === status) && `${g.fullName}${g.username}${g.phone}`.toLowerCase().replace(/\s/g, "").includes(term),
  );

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Guest accounts"
        description="Register guests who may take hotel services on credit. Credit limits are set by the Finance Manager."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Register guest
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, username or phone" className="max-w-sm flex-1" />
        <Select value={status} onValueChange={(v) => setStatusFilter(v as AccountStatus | "all")}>
          <SelectTrigger className="w-full bg-surface sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No guests found" description="Try a different search or register a new guest." />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-semibold">{g.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">@{g.username}</TableCell>
                  <TableCell className="whitespace-nowrap">{g.phone}</TableCell>
                  <TableCell>
                    <AccountStatusBadge status={g.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{date(g.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${g.fullName}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(g)}>
                          <Pencil className="h-4 w-4" /> Edit details & PIN
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetting(g)}>
                          <KeyRound className="h-4 w-4" /> Reset password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {STATUSES.filter((s) => s !== g.status).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => setStatus.mutate({ id: g.id, status: s })}>
                            <Power className="h-4 w-4" /> {s === "active" ? "Activate" : s === "inactive" ? "Deactivate" : "Suspend"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
      {editing && <GuestDialog guest={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {resetting && <ResetPasswordDialog id={resetting.id} name={resetting.fullName} onClose={() => setResetting(null)} />}
    </>
  );
}

function GuestDialog({ guest, onClose }: { guest: Guest | null; onClose: () => void }) {
  const [f, setF] = useState<GuestInput>({ fullName: guest?.fullName ?? "", phone: guest?.phone ?? "", username: guest?.username ?? "", password: "", pin: "" });
  const save = useAction(
    () =>
      guest
        ? guestsService.update(guest.id, { fullName: f.fullName, phone: f.phone, ...(f.pin ? { pin: f.pin } : {}) })
        : guestsService.create(f),
    { success: guest ? "Guest updated." : "Guest registered.", onSuccess: onClose },
  );
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={guest ? "Edit guest" : "Register guest"}
      description={guest ? undefined : "The guest signs in with this username and password, and uses the PIN to confirm charges at the desk."}
      submitLabel={guest ? "Save changes" : "Register guest"}
      pending={save.isPending}
      onSubmit={() => save.mutate(undefined)}
    >
      <TextField id="g-name" label="Full name" required value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="g-phone" label="Phone number" required value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="+251 9.." />
        <TextField id="g-username" label="Username" required value={f.username} disabled={Boolean(guest)} onChange={(v) => setF({ ...f, username: v })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {!guest && <TextField id="g-password" label="Initial password" type="password" required value={f.password} onChange={(v) => setF({ ...f, password: v })} hint="At least 6 characters." />}
        <TextField
          id="g-pin"
          label={guest ? "New confirmation PIN" : "Confirmation PIN"}
          type="password"
          inputMode="numeric"
          required={!guest}
          value={f.pin}
          onChange={(v) => setF({ ...f, pin: v.replace(/\D/g, "").slice(0, 6) })}
          hint={guest ? "Leave empty to keep the current PIN." : "4–6 digits."}
        />
      </div>
    </FormDialog>
  );
}
