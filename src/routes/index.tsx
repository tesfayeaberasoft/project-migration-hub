import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Banknote, Eye, EyeOff, KeyRound, ReceiptText, ShieldCheck, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import heroImg from "@/assets/lobby-hero.jpg";
import { LogoFull } from "@/components/brand/Logo";
import { Spinner } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, ROLE_LABEL, useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import { USE_DEMO_BACKEND } from "@/services/config";
import { errorMessage } from "@/services/http";
import type { Role } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Haroni Hotel · Credit Management Sign In" },
      { name: "description", content: "Sign in to Haroni Hotel's Digital Credit Management System for administrators, cashiers, finance and guests." },
      { property: "og:title", content: "Haroni Hotel · Credit Management Sign In" },
      { property: "og:description", content: "Secure, role-based access to guest credit, approvals, payments and debt statements at Haroni Hotel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const ROLES: { id: Role; icon: typeof Users; blurb: string; demo: [string, string] }[] = [
  { id: "guest", icon: UserRound, blurb: "Review and confirm your charges, see your balance and download receipts.", demo: ["abebe", "guest123"] },
  { id: "cashier", icon: ReceiptText, blurb: "Record services consumed on credit and send them to guests to confirm.", demo: ["cashier", "cashier123"] },
  { id: "finance", icon: Banknote, blurb: "Approve credit, set limits, record payments and run reports.", demo: ["finance", "finance123"] },
  { id: "admin", icon: ShieldCheck, blurb: "Manage staff and guest accounts, the service catalog and settings.", demo: ["admin", "admin123"] },
];

function Landing() {
  const { session, hydrated, login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("guest");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const active = ROLES.find((r) => r.id === role)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) return setError("Enter your username and password.");
    setBusy(true);
    try {
      const s = await login(username.trim(), password);
      if (s.user.role !== role) toast.info(`Signed in as ${ROLE_LABEL[s.user.role]}.`);
      void navigate({ to: ROLE_HOME[s.user.role] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src={heroImg} alt="" aria-hidden width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-hero-veil" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.1fr_460px] lg:px-10">
        <section className="animate-fade-up">
          <LogoFull className="w-40 sm:w-52" />
          <div className="mt-10 text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">Digital Credit Management System</div>
          <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl">
            Every credit, <span className="shimmer-text">accounted for.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
            Paper slips replaced by one trusted record — from the cashier's desk to the guest's confirmation to the finance office.
          </p>
          <div className="mt-10 hidden max-w-xl gap-3 sm:grid sm:grid-cols-3">
            {[
              ["Guest-confirmed", "Nothing is billed until the guest confirms it."],
              ["Limit-protected", "Credit is checked and reserved on every charge."],
              ["Fully audited", "Every action is logged with who and when."],
            ].map(([t, d]) => (
              <div key={t} className="glass-panel rounded-xl p-4">
                <div className="gold-hairline mb-3 w-10" />
                <div className="text-sm font-semibold">{t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel animate-fade-up rounded-2xl p-6 shadow-gold sm:p-8" style={{ animationDelay: "120ms" }}>
          {hydrated && session ? (
            <div className="py-6 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Welcome back</div>
              <div className="mt-2 font-display text-3xl font-semibold">{session.user.fullName}</div>
              <div className="mt-1 text-sm text-muted-foreground">{ROLE_LABEL[session.user.role]}</div>
              <Button asChild size="lg" className="mt-8 w-full">
                <Link to={ROLE_HOME[session.user.role]}>
                  Continue to your dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-3xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose your role, then use the username and password given by the hotel.</p>

              <div className="mt-6 grid grid-cols-4 gap-1.5 rounded-xl border bg-background/50 p-1.5" role="tablist" aria-label="Sign in as">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="tab"
                    aria-selected={role === r.id}
                    onClick={() => setRole(r.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[11px] font-semibold transition-all",
                      role === r.id ? "bg-gold-gradient text-primary-foreground shadow-gold" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <r.icon className="h-4 w-4" />
                    {r.id === "finance" ? "Finance" : r.id === "admin" ? "Admin" : ROLE_LABEL[r.id]}
                  </button>
                ))}
              </div>
              <p className="mt-3 min-h-[2.5rem] text-xs text-muted-foreground">{active.blurb}</p>

              <form onSubmit={submit} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 bg-background/60" placeholder="e.g. abebe" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-primary hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-background/60 pr-11" />
                    <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <Spinner className="h-4 w-4 text-current" /> : <KeyRound className="h-4 w-4" />} Sign in as {ROLE_LABEL[role]}
                </Button>
              </form>

              {USE_DEMO_BACKEND && (
                <div className="mt-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Demo accounts</div>
                  <p className="mt-1 text-xs text-muted-foreground">The preview runs on sample data. Tap to fill in the {ROLE_LABEL[role].toLowerCase()} account.</p>
                  <Button
                    variant="gold"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setUsername(active.demo[0]);
                      setPassword(active.demo[1]);
                    }}
                  >
                    Use {active.demo[0]} / {active.demo[1]}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}

function ForgotPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 bg-popover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Reset your password</DialogTitle>
          <DialogDescription>Enter your username. The System Administrator will reset your password and give you a new one.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="forgot-username">Username</Label>
          <Input id="forgot-username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || !username.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await authService.forgotPassword(username.trim());
                toast.success(r.message);
                onOpenChange(false);
                setUsername("");
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
