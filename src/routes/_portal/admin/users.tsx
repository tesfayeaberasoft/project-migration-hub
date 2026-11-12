import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, MoreHorizontal, Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";
import { FormDialog, TextField } from "@/components/common/FormDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { TableShell } from "@/components/common/Panel";
import { SearchInput } from "@/components/common/SearchInput";
import { AccountStatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { ROLE_LABEL, useAuth } from "@/hooks/use-auth";
import { dateTime } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { usersService, type StaffInput } from "@/services/users.service";
import type { AccountStatus, StaffUser } from "@/types";

export const Route = createFileRoute("/_portal/admin/users")({
  head: () => pageHead("User Management", "Create and manage staff accounts and roles."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.users()),
  component: UsersPage,
});

type StaffRole = StaffUser["role"];
const ROLES: StaffRole[] = ["admin", "cashier", "finance"];

function UsersPage() {
  const { data: users } = useSuspenseQuery(q.users());
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StaffUser | "new" | null>(null);
  const [resetting, setResetting] = useState<StaffUser | null>(null);
  const setStatus = useAction((v: { id: string; status: AccountStatus }) => usersService.setStatus(v.id, v.status), { success: "Account status updated." });

  const list = users.filter((u) => `${u.fullName} ${u.username} ${u.phone}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="User management"
        description="Cashier, Finance Manager and Administrator accounts. Guests are managed under Guest Accounts."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        }
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, username or phone" className="mb-4 max-w-sm" />
      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-semibold">{u.fullName}</TableCell>
                <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                <TableCell className="whitespace-nowrap">{u.phone}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "info" : u.role === "finance" ? "gold" : "muted"}>{ROLE_LABEL[u.role]}</Badge>
                </TableCell>
                <TableCell>
                  <AccountStatusBadge status={u.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dateTime(u.lastLoginAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for ${u.fullName}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(u)}>
                        <Pencil className="h-4 w-4" /> Edit details & role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResetting(u)}>
                        <KeyRound className="h-4 w-4" /> Reset password
                      </DropdownMenuItem>
                      {u.id !== session?.user.id && (
                        <>
                          <DropdownMenuSeparator />
                          {(["active", "inactive", "suspended"] as AccountStatus[])
                            .filter((s) => s !== u.status)
                            .map((s) => (
                              <DropdownMenuItem key={s} onClick={() => setStatus.mutate({ id: u.id, status: s })}>
                                <Power className="h-4 w-4" /> {s === "active" ? "Activate" : s === "inactive" ? "Deactivate" : "Suspend"}
                              </DropdownMenuItem>
                            ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
      {editing && <UserDialog user={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {resetting && <ResetPasswordDialog name={resetting.fullName} id={resetting.id} onClose={() => setResetting(null)} />}
    </>
  );
}

function UserDialog({ user, onClose }: { user: StaffUser | null; onClose: () => void }) {
  const [f, setF] = useState<StaffInput>({ fullName: user?.fullName ?? "", username: user?.username ?? "", phone: user?.phone ?? "", role: user?.role ?? "cashier", password: "" });
  const save = useAction(
    () => (user ? usersService.update(user.id, { fullName: f.fullName, phone: f.phone, role: f.role }) : usersService.create(f)),
    { success: user ? "User updated." : "User created.", onSuccess: onClose },
  );
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={user ? "Edit user" : "Add staff user"} submitLabel={user ? "Save changes" : "Create user"} pending={save.isPending} onSubmit={() => save.mutate(undefined)}>
      <TextField id="fullName" label="Full name" required value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="username" label="Username" required value={f.username} disabled={Boolean(user)} onChange={(v) => setF({ ...f, username: v })} />
        <TextField id="phone" label="Phone number" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="+251 9.." />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as StaffRole })}>
          <SelectTrigger className="bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!user && <TextField id="password" label="Initial password" type="password" required value={f.password ?? ""} onChange={(v) => setF({ ...f, password: v })} hint="At least 6 characters. Share it with the user privately." />}
    </FormDialog>
  );
}

export function ResetPasswordDialog({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const reset = useAction(() => usersService.resetPassword(id, pw), { success: `Password reset for ${name}.`, onSuccess: onClose });
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Reset password" description={`Set a new password for ${name}.`} submitLabel="Reset password" pending={reset.isPending} onSubmit={() => reset.mutate(undefined)}>
      <TextField id="newpw" label="New password" type="password" required value={pw} onChange={setPw} hint="At least 6 characters." />
    </FormDialog>
  );
}
