import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Menu, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LogoLockup } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ROLE_LABEL, useAuth } from "@/hooks/use-auth";
import { fromNow, initials } from "@/lib/format";
import { q } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { USE_DEMO_BACKEND } from "@/services/config";
import { guestSelfService } from "@/services/finance.service";
import type { AuthUser } from "@/types";
import { NAV } from "./nav";

function NavList({ user, onNavigate }: { user: AuthUser; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
      {NAV[user.role].map((group) => (
        <div key={group.label}>
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70">{group.label}</div>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  activeOptions={{ exact: item.exact ?? false }}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold ring-1 ring-sidebar-border" }}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-primary/70 transition-colors group-hover:text-primary" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({ user, onNavigate, onSignOut }: { user: AuthUser; onNavigate?: () => void; onSignOut: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-6 py-6">
        <LogoLockup />
      </div>
      <NavList user={user} {...(onNavigate ? { onNavigate } : {})} />
      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent"
          activeProps={{ className: "bg-sidebar-accent" }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-xs font-bold text-primary-foreground">
            {initials(user.fullName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{user.fullName}</div>
            <div className="truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</div>
          </div>
        </Link>
        <Button variant="ghost" className="mt-1 w-full justify-start gap-3 px-3 text-muted-foreground" onClick={onSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function GuestNotifications() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(q.myNotifications());
  const unread = data.filter((n) => !n.read).length;
  return (
    <Popover
      onOpenChange={async (open) => {
        if (!open && unread) {
          await guestSelfService.markNotificationsRead();
          void qc.invalidateQueries({ queryKey: ["me", "notifications"] });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 border-primary/20 p-0">
        <div className="border-b px-4 py-3 font-display text-lg font-semibold">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {data.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</div>}
          {data.map((n) => (
            <div key={n.id} className={cn("border-b px-4 py-3 last:border-0", !n.read && "bg-primary/5")}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="shrink-0 text-[11px] text-muted-foreground">{fromNow(n.at)}</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await qc.cancelQueries();
    await logout();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody user={user} onSignOut={signOut} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody user={user} onNavigate={() => setOpen(false)} onSignOut={signOut} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="lg:hidden">
            <LogoLockup compact />
          </div>
          <div className="hidden text-xs uppercase tracking-[0.24em] text-muted-foreground lg:block">{ROLE_LABEL[user.role]} portal</div>
          <div className="ml-auto flex items-center gap-2">
            {USE_DEMO_BACKEND && (
              <Badge variant="gold" className="hidden sm:inline-flex">
                Demo data
              </Badge>
            )}
            {user.role === "guest" && <GuestNotifications />}
            <Button asChild variant="ghost" size="icon" aria-label="My profile">
              <Link to="/profile">
                <UserRound className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </header>
        <main key={pathname} className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
