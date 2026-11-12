// In-browser demo backend. Implements the same endpoints documented in
// src/services/API_CONTRACT.md so the UI works before the PHP API is connected.
import {
  RESERVING_STATUSES,
  availableCredit,
  excessOverAvailable,
  lineTotal,
  outstandingDebt,
  roundMoney,
  statusAfterGuestConfirm,
  sumReservations,
} from "@/lib/credit";
import type {
  AuditLog,
  CreditTransaction,
  GuestAccount,
  HotelService,
  Payment,
  ReportPeriod,
  ReportResult,
  ReportType,
  Role,
  TransactionItem,
} from "@/types";
import { ApiError, type HttpMethod, type Query } from "../http";
import { readSession } from "../session";
import { db, nextId, persist, replaceState } from "./db";
import { DEMO_VERSION, type DemoGuest, type DemoState } from "./seed";

interface Actor {
  id: string;
  role: Role;
  name: string;
  guestId?: string;
}
interface Ctx {
  actor: Actor | null;
  // Loose request shapes: the demo backend validates every field itself.
  body: any;
  query: any;
  params: any;
  token?: string | undefined;
}
type Handler = (ctx: Ctx) => unknown;
interface RouteDef {
  method: HttpMethod;
  re: RegExp;
  keys: string[];
  roles?: Role[] | undefined;
  handler: Handler;
}

const routes: RouteDef[] = [];
function route(method: HttpMethod, pattern: string, roles: Role[] | null, handler: Handler) {
  const keys: string[] = [];
  const re = new RegExp(
    "^" + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$",
  );
  routes.push({ method, re, keys, roles: roles ?? undefined, handler });
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const otpCodes = new Map<string, string>();

const fail = (message: string, status = 400): never => {
  throw new ApiError(message, status);
};
const now = () => new Date().toISOString();

function audit(ctx: Ctx | null, category: AuditLog["category"], action: string, details?: string) {
  const s = db();
  s.audit.unshift({
    id: nextId("a"),
    at: now(),
    actor: ctx?.actor?.name ?? "System",
    role: ctx?.actor?.role ?? "system",
    category,
    action,
    details,
  });
  if (s.audit.length > 800) s.audit.length = 800;
}

function notify(guestId: string, title: string, body: string) {
  const s = db();
  (s.notifications[guestId] ??= []).unshift({ id: nextId("n"), at: now(), title, body, read: false });
}

function findGuest(id: string) {
  return db().guests.find((g) => g.id === id) ?? fail("Guest not found", 404);
}
function findTx(id: string) {
  return db().transactions.find((t) => t.id === id) ?? fail("Transaction not found", 404);
}

export function guestAccount(g: DemoGuest, s: DemoState = db()): GuestAccount {
  const txs = s.transactions.filter((t) => t.guestId === g.id);
  const pays = s.payments.filter((p) => p.guestId === g.id);
  const hist = s.historical.filter((h) => h.guestId === g.id);
  const outstanding = outstandingDebt(txs, pays, hist);
  const reservations = sumReservations(txs);
  const { password: _p, pin: _pin, ...pub } = g;
  return {
    ...pub,
    historicalDebt: roundMoney(hist.filter((h) => h.status === "approved").reduce((a, h) => a + h.amount, 0)),
    approvedCredit: roundMoney(txs.filter((t) => t.status === "approved").reduce((a, t) => a + t.total, 0)),
    totalPayments: roundMoney(pays.filter((p) => p.verified).reduce((a, p) => a + p.amount, 0)),
    outstandingDebt: outstanding,
    pendingReservations: reservations,
    availableCredit: availableCredit(g.creditLimit, outstanding, reservations),
    exceedsLimit: outstanding > g.creditLimit,
  };
}

function sweepDeadlines() {
  const s = db();
  const t = Date.now();
  let changed = false;
  for (const tx of s.transactions) {
    if (tx.status !== "pending_guest" || !tx.confirmationDeadline) continue;
    const deadline = Date.parse(tx.confirmationDeadline);
    if (deadline < t) {
      tx.status = "expired";
      tx.history.push({ at: now(), by: "System", action: "Expired — confirmation deadline passed; reservation released" });
      audit(null, "transaction", `Expired ${tx.code}`, tx.guestName);
      changed = true;
    } else if (
      deadline - t < s.settings.reminderBeforeHours * HOUR &&
      !tx.history.some((h) => h.action.startsWith("Reminder"))
    ) {
      tx.history.push({ at: now(), by: "System", action: "Reminder sent to guest" });
      notify(tx.guestId, "Confirmation reminder", `${tx.code} must be confirmed before ${new Date(deadline).toLocaleString()}.`);
      changed = true;
    }
  }
  if (changed) persist();
}

function buildItems(raw: unknown): TransactionItem[] {
  const s = db();
  if (!Array.isArray(raw) || raw.length === 0) fail("Add at least one service.");
  return (raw as any[]).map((line) => {
    const svc = s.services.find((x) => x.id === line.serviceId) ?? fail("Unknown service selected.");
    if (!svc.available) fail(`${svc.name} is currently unavailable.`);
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) fail(`Enter a valid quantity for ${svc.name}.`);
    const requested = line.requestedPrice != null && line.requestedPrice !== "" ? Number(line.requestedPrice) : null;
    const hasRequest = requested != null && requested !== svc.price;
    if (hasRequest && (!Number.isFinite(requested!) || requested! <= 0)) fail(`Enter a valid requested price for ${svc.name}.`);
    if (hasRequest && !String(line.priceReason ?? "").trim()) fail(`Give a reason for the special price on ${svc.name}.`);
    const unitPrice = hasRequest ? requested! : svc.price;
    return {
      serviceId: svc.id,
      serviceName: svc.name,
      category: svc.category,
      quantity,
      unitPrice,
      catalogPrice: svc.price,
      total: lineTotal(quantity, unitPrice),
      ...(hasRequest ? { priceRequest: { requestedPrice: requested!, reason: String(line.priceReason).trim(), status: "pending" as const } } : {}),
    };
  });
}

function evaluateCredit(tx: CreditTransaction) {
  const s = db();
  const g = findGuest(tx.guestId);
  const txs = s.transactions.filter((t) => t.guestId === g.id);
  const outstanding = outstandingDebt(txs, s.payments.filter((p) => p.guestId === g.id), s.historical.filter((h) => h.guestId === g.id));
  const available = availableCredit(g.creditLimit, outstanding, sumReservations(txs, tx.id));
  tx.excessAmount = excessOverAvailable(tx.total, available);
  tx.exceedsLimit = tx.excessAmount > 0;
}

function sendToGuest(tx: CreditTransaction, by: string) {
  const s = db();
  evaluateCredit(tx);
  tx.status = "pending_guest";
  tx.confirmationDeadline = new Date(Date.now() + s.settings.confirmationDeadlineHours * HOUR).toISOString();
  tx.history.push({
    at: now(),
    by,
    action: "Submitted to guest for confirmation",
    note: tx.exceedsLimit ? `Exceeds available credit by ${tx.excessAmount.toLocaleString()} ETB — will need exceptional approval` : undefined,
  });
  notify(tx.guestId, "New transaction to confirm", `${tx.code} · ${tx.total.toLocaleString()} ETB awaits your confirmation.`);
}

function syncPriceRequests(tx: CreditTransaction, by: string) {
  const s = db();
  s.priceRequests = s.priceRequests.filter((p) => !(p.transactionId === tx.id && p.status === "pending"));
  for (const item of tx.items) {
    if (item.priceRequest?.status === "pending") {
      s.priceRequests.unshift({
        id: nextId("pr"),
        kind: "transaction",
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        currentPrice: item.catalogPrice,
        requestedPrice: item.priceRequest.requestedPrice,
        reason: item.priceRequest.reason,
        requestedBy: by,
        requestedAt: now(),
        transactionId: tx.id,
        transactionCode: tx.code,
        status: "pending",
      });
    }
  }
}

function recompute(tx: CreditTransaction) {
  tx.total = roundMoney(tx.items.reduce((a, i) => a + i.total, 0));
}

function staffPublic(u: DemoState["staff"][number]) {
  const { password: _p, ...rest } = u;
  return rest;
}

function guestPublic(g: DemoGuest) {
  const { password: _p, pin: _pin, ...rest } = g;
  return rest;
}

function scopeTx(ctx: Ctx, txs: CreditTransaction[]) {
  return ctx.actor?.role === "guest" ? txs.filter((t) => t.guestId === ctx.actor!.guestId) : txs;
}

function requireReason(v: unknown, label = "reason") {
  const r = String(v ?? "").trim();
  if (r.length < 5) fail(`Please enter a ${label} (at least 5 characters).`);
  return r;
}

// ---------------------------------------------------------------- auth
route("POST", "/auth/login", null, ({ body }) => {
  const s = db();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!username || !password) fail("Enter your username and password.");
  const staff = s.staff.find((u) => u.username.toLowerCase() === username);
  const guest = s.guests.find((u) => u.username.toLowerCase() === username);
  const account = staff ?? guest;
  if (!account || account.password !== password) fail("Invalid username or password.", 401);
  if (account!.status !== "active") fail("This account is not active. Contact the System Administrator.", 403);
  const token = `demo.${crypto.randomUUID()}`;
  s.sessions[token] = account!.id;
  const user = staff
    ? { id: staff.id, role: staff.role, fullName: staff.fullName, username: staff.username, phone: staff.phone, status: staff.status }
    : { id: guest!.id, role: "guest" as const, fullName: guest!.fullName, username: guest!.username, phone: guest!.phone, status: guest!.status, guestId: guest!.id };
  if (staff) staff.lastLoginAt = now();
  audit({ actor: { id: user.id, role: user.role, name: user.fullName }, body: {}, query: {}, params: {} }, "auth", "Signed in");
  return { token, user };
});

route("POST", "/auth/logout", [], (ctx) => {
  if (ctx.token) delete db().sessions[ctx.token];
  audit(ctx, "auth", "Signed out");
  return { ok: true };
});

route("POST", "/auth/forgot-password", null, ({ body }) => {
  const username = String(body.username ?? "").trim();
  if (!username) fail("Enter your username.");
  audit(null, "auth", "Password reset requested", username);
  return { message: "Your request was sent to the System Administrator, who will reset your password." };
});

route("POST", "/auth/change-password", [], (ctx) => {
  const s = db();
  const { currentPassword, newPassword } = ctx.body;
  const acc = s.staff.find((u) => u.id === ctx.actor!.id) ?? s.guests.find((g) => g.id === ctx.actor!.id);
  if (!acc) fail("Account not found", 404);
  if (acc!.password !== currentPassword) fail("Your current password is incorrect.");
  if (String(newPassword ?? "").length < 6) fail("New password must be at least 6 characters.");
  acc!.password = newPassword;
  audit(ctx, "auth", "Changed password");
  return { ok: true };
});

// ---------------------------------------------------------------- dashboards
route("GET", "/dashboard/admin", ["admin"], () => {
  const s = db();
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * DAY);
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      transactions: s.transactions.filter((t) => t.createdAt.slice(0, 10) === key).length,
      logins: s.audit.filter((a) => a.category === "auth" && a.at.slice(0, 10) === key).length,
    };
  });
  return {
    totalGuests: s.guests.length,
    activeGuests: s.guests.filter((g) => g.status === "active").length,
    totalUsers: s.staff.length,
    cashiers: s.staff.filter((u) => u.role === "cashier").length,
    financeManagers: s.staff.filter((u) => u.role === "finance").length,
    admins: s.staff.filter((u) => u.role === "admin").length,
    totalTransactions: s.transactions.length,
    services: s.services.length,
    activity: days,
    recentAudit: s.audit.slice(0, 8),
  };
});

route("GET", "/dashboard/cashier", ["cashier"], (ctx) => {
  const s = db();
  const by = (st: CreditTransaction["status"][]) => s.transactions.filter((t) => st.includes(t.status)).length;
  return {
    totalRecorded: s.transactions.length,
    recordedByMe: s.transactions.filter((t) => t.createdBy === ctx.actor!.name).length,
    pendingGuest: by(["pending_guest"]),
    disputed: by(["disputed"]),
    awaitingFinance: by(["pending_finance", "pending_exception"]),
    approved: by(["approved"]),
    rejected: by(["rejected"]),
    pendingPrice: by(["pending_price_approval"]),
    recent: s.transactions.slice(0, 7),
  };
});

function monthlySeries(months: number, s = db()) {
  return [...Array(months)].map((_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = d.toISOString().slice(0, 7);
    return {
      label: d.toLocaleDateString("en", { month: "short" }),
      credit: roundMoney(s.transactions.filter((t) => t.status === "approved" && t.createdAt.slice(0, 7) === key).reduce((a, t) => a + t.total, 0)),
      payments: roundMoney(s.payments.filter((p) => p.verified && p.paidAt.slice(0, 7) === key).reduce((a, p) => a + p.amount, 0)),
    };
  });
}

route("GET", "/dashboard/finance", ["finance"], () => {
  const s = db();
  const accounts = s.guests.map((g) => guestAccount(g));
  return {
    totalOutstanding: roundMoney(accounts.reduce((a, g) => a + g.outstandingDebt, 0)),
    totalPayments: roundMoney(s.payments.filter((p) => p.verified).reduce((a, p) => a + p.amount, 0)),
    totalApprovedCredit: roundMoney(s.transactions.filter((t) => t.status === "approved").reduce((a, t) => a + t.total, 0)),
    approvedCount: s.transactions.filter((t) => t.status === "approved").length,
    pendingApprovals: s.transactions.filter((t) => t.status === "pending_finance").length,
    pendingExceptions: s.transactions.filter((t) => t.status === "pending_exception").length,
    pendingPriceRequests: s.priceRequests.filter((p) => p.status === "pending").length,
    pendingHistorical: s.historical.filter((h) => h.status === "pending_verification").length,
    totalHistorical: roundMoney(s.historical.filter((h) => h.status === "approved").reduce((a, h) => a + h.amount, 0)),
    historicalTarget: s.settings.historicalDebtTarget,
    guestCount: s.guests.length,
    exceeding: accounts.filter((a) => a.exceedsLimit).sort((a, b) => b.outstandingDebt - b.creditLimit - (a.outstandingDebt - a.creditLimit)),
    series: monthlySeries(6),
    recentPayments: s.payments.slice(0, 5),
  };
});

route("GET", "/dashboard/guest", ["guest"], (ctx) => {
  const s = db();
  const g = findGuest(ctx.actor!.guestId!);
  const txs = s.transactions.filter((t) => t.guestId === g.id);
  const pays = s.payments.filter((p) => p.guestId === g.id);
  const activity = [
    ...txs.flatMap((t) => t.history.map((h) => ({ at: h.at, title: `${t.code} · ${h.action}`, amount: t.total, kind: "transaction" as const }))),
    ...pays.map((p) => ({ at: p.paidAt, title: `Payment received · ${p.receiptNumber}`, amount: p.amount, kind: "payment" as const })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);
  return {
    account: guestAccount(g),
    pending: txs.filter((t) => t.status === "pending_guest"),
    activity,
    notifications: (s.notifications[g.id] ?? []).slice(0, 10),
  };
});

// ---------------------------------------------------------------- staff users
route("GET", "/users", ["admin"], () => db().staff.map(staffPublic));
route("POST", "/users", ["admin"], (ctx) => {
  const s = db();
  const { fullName, username, phone, role, password } = ctx.body;
  if (!String(fullName ?? "").trim() || !String(username ?? "").trim()) fail("Full name and username are required.");
  if (!["admin", "cashier", "finance"].includes(role)) fail("Choose a valid role.");
  if (String(password ?? "").length < 6) fail("Password must be at least 6 characters.");
  const uname = String(username).trim().toLowerCase();
  if ([...s.staff, ...s.guests].some((u) => u.username.toLowerCase() === uname)) fail("That username is already taken.");
  const u = { id: nextId("u"), fullName: String(fullName).trim(), username: uname, phone: String(phone ?? ""), role, password, status: "active" as const, createdAt: now() };
  s.staff.push(u);
  audit(ctx, "user", "Created user", `${u.fullName} (${role})`);
  return staffPublic(u);
});
route("PUT", "/users/:id", ["admin"], (ctx) => {
  const s = db();
  const u = s.staff.find((x) => x.id === ctx.params.id) ?? fail("User not found", 404);
  const { fullName, phone, role } = ctx.body;
  if (role && !["admin", "cashier", "finance"].includes(role)) fail("Choose a valid role.");
  if (fullName) u!.fullName = String(fullName).trim();
  if (phone !== undefined) u!.phone = String(phone);
  if (role) u!.role = role;
  audit(ctx, "user", "Updated user", u!.fullName);
  return staffPublic(u!);
});
route("POST", "/users/:id/status", ["admin"], (ctx) => {
  const u = db().staff.find((x) => x.id === ctx.params.id) ?? fail("User not found", 404);
  if (u!.id === ctx.actor!.id) fail("You cannot change your own account status.");
  u!.status = ctx.body.status;
  audit(ctx, "user", `Set user ${ctx.body.status}`, u!.fullName);
  return staffPublic(u!);
});
route("POST", "/users/:id/reset-password", ["admin"], (ctx) => {
  const s = db();
  const u = s.staff.find((x) => x.id === ctx.params.id) ?? s.guests.find((x) => x.id === ctx.params.id) ?? fail("Account not found", 404);
  if (String(ctx.body.newPassword ?? "").length < 6) fail("Password must be at least 6 characters.");
  u!.password = ctx.body.newPassword;
  audit(ctx, "user", "Reset password", u!.fullName);
  return { ok: true };
});

// ---------------------------------------------------------------- guests
route("GET", "/guests", ["admin", "cashier", "finance"], (ctx) => {
  const s = db();
  const q = String(ctx.query.search ?? "").trim().toLowerCase();
  const status = ctx.query.status;
  let list = s.guests.filter(
    (g) => !q || g.fullName.toLowerCase().includes(q) || g.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) || g.username.includes(q),
  );
  if (status) list = list.filter((g) => g.status === status);
  if (ctx.actor!.role === "admin") return list.map(guestPublic);
  return list.map((g) => guestAccount(g));
});
route("GET", "/guests/:id", ["admin", "cashier", "finance"], (ctx) => {
  const s = db();
  const g = findGuest(ctx.params.id);
  if (ctx.actor!.role === "admin") return { account: guestPublic(g) };
  const base = { account: guestAccount(g), transactions: s.transactions.filter((t) => t.guestId === g.id) };
  if (ctx.actor!.role === "cashier") return base;
  return {
    ...base,
    payments: s.payments.filter((p) => p.guestId === g.id),
    historical: s.historical.filter((h) => h.guestId === g.id),
    limitChanges: s.limitChanges.filter((c) => c.guestId === g.id),
  };
});
route("POST", "/guests", ["admin"], (ctx) => {
  const s = db();
  const { fullName, phone, username, password, pin } = ctx.body;
  if (!String(fullName ?? "").trim()) fail("Full name is required.");
  if (!String(phone ?? "").trim()) fail("Phone number is required.");
  const uname = String(username ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(uname)) fail("Username must be at least 3 letters/numbers.");
  if ([...s.staff, ...s.guests].some((u) => u.username.toLowerCase() === uname)) fail("That username is already taken.");
  if (String(password ?? "").length < 6) fail("Password must be at least 6 characters.");
  if (!/^\d{4,6}$/.test(String(pin ?? ""))) fail("PIN must be 4–6 digits.");
  const g: DemoGuest = { id: nextId("g"), fullName: String(fullName).trim(), phone: String(phone).trim(), username: uname, password, pin: String(pin), status: "active", creditLimit: 0, createdAt: now() };
  s.guests.push(g);
  audit(ctx, "guest", "Registered guest account", g.fullName);
  return guestPublic(g);
});
route("PUT", "/guests/:id", ["admin"], (ctx) => {
  const g = findGuest(ctx.params.id);
  const { fullName, phone, pin } = ctx.body;
  if (fullName) g.fullName = String(fullName).trim();
  if (phone) g.phone = String(phone).trim();
  if (pin) {
    if (!/^\d{4,6}$/.test(String(pin))) fail("PIN must be 4–6 digits.");
    g.pin = String(pin);
  }
  audit(ctx, "guest", "Updated guest information", g.fullName);
  return guestPublic(g);
});
route("POST", "/guests/:id/status", ["admin"], (ctx) => {
  const g = findGuest(ctx.params.id);
  g.status = ctx.body.status;
  audit(ctx, "guest", `Set guest ${ctx.body.status}`, g.fullName);
  return guestPublic(g);
});
route("POST", "/guests/:id/credit-limit", ["finance"], (ctx) => {
  const s = db();
  const g = findGuest(ctx.params.id);
  const limit = Number(ctx.body.creditLimit);
  if (!Number.isFinite(limit) || limit < 0) fail("Enter a valid credit limit.");
  const reason = requireReason(ctx.body.reason);
  s.limitChanges.unshift({ id: nextId("cl"), guestId: g.id, guestName: g.fullName, previousLimit: g.creditLimit, newLimit: limit, reason, changedBy: ctx.actor!.name, changedAt: now() });
  audit(ctx, "credit", "Updated credit limit", `${g.fullName}: ${g.creditLimit.toLocaleString()} → ${limit.toLocaleString()} ETB`);
  g.creditLimit = limit;
  return guestAccount(g);
});
route("GET", "/credit-limits/history", ["finance"], () => db().limitChanges);

// ---------------------------------------------------------------- services
route("GET", "/services", [], () => db().services);
route("POST", "/services", ["admin"], (ctx) => {
  const s = db();
  const { name, category, price, available } = ctx.body;
  if (!String(name ?? "").trim()) fail("Service name is required.");
  if (!["food", "drinks", "accommodation", "other"].includes(category)) fail("Choose a category.");
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) fail("Enter a valid price.");
  const svc: HotelService = { id: nextId("s"), name: String(name).trim(), category, price: p, available: available !== false, priceHistory: [{ price: p, effectiveFrom: now(), approvedBy: "Initial price" }] };
  s.services.push(svc);
  audit(ctx, "catalog", "Added service", `${svc.name} · ${p.toLocaleString()} ETB`);
  return svc;
});
route("PUT", "/services/:id", ["admin"], (ctx) => {
  const s = db();
  const svc = s.services.find((x) => x.id === ctx.params.id) ?? fail("Service not found", 404);
  const { name, category, available, price, priceReason } = ctx.body;
  if (name) svc!.name = String(name).trim();
  if (category) svc!.category = category;
  if (available !== undefined) svc!.available = Boolean(available);
  if (price !== undefined && Number(price) !== svc!.price) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) fail("Enter a valid price.");
    const reason = requireReason(priceReason, "reason for the price change");
    svc!.proposedPrice = p;
    s.priceRequests = s.priceRequests.filter((r) => !(r.kind === "catalog" && r.serviceId === svc!.id && r.status === "pending"));
    s.priceRequests.unshift({ id: nextId("pr"), kind: "catalog", serviceId: svc!.id, serviceName: svc!.name, currentPrice: svc!.price, requestedPrice: p, reason, requestedBy: ctx.actor!.name, requestedAt: now(), status: "pending" });
    audit(ctx, "catalog", "Proposed price change", `${svc!.name}: ${svc!.price.toLocaleString()} → ${p.toLocaleString()} ETB`);
  } else {
    audit(ctx, "catalog", "Updated service", svc!.name);
  }
  return svc;
});

// ---------------------------------------------------------------- price requests
route("GET", "/price-requests", ["finance", "admin", "cashier"], () => db().priceRequests);
function decidePrice(ctx: Ctx, approve: boolean) {
  const s = db();
  const pr = s.priceRequests.find((x) => x.id === ctx.params.id) ?? fail("Request not found", 404);
  if (pr!.status !== "pending") fail("This request was already decided.");
  pr!.status = approve ? "approved" : "rejected";
  pr!.decidedBy = ctx.actor!.name;
  pr!.decidedAt = now();
  if (pr!.kind === "catalog") {
    const svc = s.services.find((x) => x.id === pr!.serviceId);
    if (svc) {
      if (approve) {
        svc.price = pr!.requestedPrice;
        svc.priceHistory.unshift({ price: pr!.requestedPrice, effectiveFrom: now(), approvedBy: ctx.actor!.name });
      }
      svc.proposedPrice = undefined;
    }
  } else if (pr!.transactionId) {
    const tx = findTx(pr!.transactionId);
    for (const item of tx.items) {
      if (item.serviceId === pr!.serviceId && item.priceRequest?.status === "pending") {
        item.priceRequest.status = approve ? "approved" : "rejected";
        if (!approve) {
          item.unitPrice = item.catalogPrice;
          item.total = lineTotal(item.quantity, item.catalogPrice);
        }
      }
    }
    recompute(tx);
    tx.history.push({ at: now(), by: ctx.actor!.name, action: `Special price ${approve ? "approved" : "rejected"} for ${pr!.serviceName}` });
    if (tx.status === "pending_price_approval" && !tx.items.some((i) => i.priceRequest?.status === "pending")) {
      sendToGuest(tx, "System");
    }
  }
  audit(ctx, "catalog", `${approve ? "Approved" : "Rejected"} price request`, `${pr!.serviceName}: ${pr!.requestedPrice.toLocaleString()} ETB`);
  return pr;
}
route("POST", "/price-requests/:id/approve", ["finance"], (ctx) => decidePrice(ctx, true));
route("POST", "/price-requests/:id/reject", ["finance"], (ctx) => decidePrice(ctx, false));

// ---------------------------------------------------------------- transactions
route("GET", "/transactions", [], (ctx) => {
  let list = scopeTx(ctx, db().transactions);
  const { status, guestId, search } = ctx.query;
  if (status) {
    const set = String(status).split(",");
    list = list.filter((t) => set.includes(t.status));
  }
  if (guestId) list = list.filter((t) => t.guestId === guestId);
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter((t) => t.code.toLowerCase().includes(q) || t.guestName.toLowerCase().includes(q));
  }
  return list;
});
route("GET", "/transactions/:id", [], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (ctx.actor!.role === "guest" && tx.guestId !== ctx.actor!.guestId) fail("Not found", 404);
  if (ctx.actor!.role === "admin") fail("Administrators cannot view financial transactions.", 403);
  return { transaction: tx, account: ctx.actor!.role === "guest" ? undefined : guestAccount(findGuest(tx.guestId)) };
});
route("POST", "/transactions", ["cashier"], (ctx) => {
  const s = db();
  const g = findGuest(String(ctx.body.guestId ?? ""));
  if (g.status !== "active") fail("This guest account is not active.");
  const items = buildItems(ctx.body.items);
  const consumptionDate = ctx.body.consumptionDate ? new Date(ctx.body.consumptionDate).toISOString() : now();
  const n = s.counters.tx++;
  const tx: CreditTransaction = {
    id: `t-${n}`,
    code: `HTX-${n}`,
    guestId: g.id,
    guestName: g.fullName,
    items,
    total: 0,
    consumptionDate,
    createdAt: now(),
    createdBy: ctx.actor!.name,
    status: "pending_guest",
    exceedsLimit: false,
    excessAmount: 0,
    revision: 1,
    history: [{ at: now(), by: ctx.actor!.name, action: "Recorded" }],
  };
  recompute(tx);
  s.transactions.unshift(tx);
  if (items.some((i) => i.priceRequest)) {
    evaluateCredit(tx);
    tx.status = "pending_price_approval";
    tx.history.push({ at: now(), by: ctx.actor!.name, action: "Sent to Finance for special price approval" });
    syncPriceRequests(tx, ctx.actor!.name);
  } else {
    sendToGuest(tx, ctx.actor!.name);
  }
  audit(ctx, "transaction", `Recorded ${tx.code}`, `${g.fullName} · ${tx.total.toLocaleString()} ETB`);
  return tx;
});
route("PUT", "/transactions/:id", ["cashier"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (!["disputed", "pending_guest", "pending_price_approval"].includes(tx.status)) fail("Only disputed or unconfirmed transactions can be corrected.");
  const before = tx.total;
  tx.items = buildItems(ctx.body.items);
  if (ctx.body.consumptionDate) tx.consumptionDate = new Date(ctx.body.consumptionDate).toISOString();
  recompute(tx);
  tx.revision += 1;
  const note = String(ctx.body.note ?? "").trim() || undefined;
  tx.history.push({ at: now(), by: ctx.actor!.name, action: `Corrected (revision ${tx.revision}): ${before.toLocaleString()} → ${tx.total.toLocaleString()} ETB`, note });
  tx.disputeReason = undefined;
  if (tx.items.some((i) => i.priceRequest?.status === "pending")) {
    evaluateCredit(tx);
    tx.status = "pending_price_approval";
    syncPriceRequests(tx, ctx.actor!.name);
  } else {
    sendToGuest(tx, ctx.actor!.name);
  }
  audit(ctx, "transaction", `Corrected and resubmitted ${tx.code}`, note);
  return tx;
});
route("POST", "/transactions/:id/confirm", ["guest"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (tx.guestId !== ctx.actor!.guestId) fail("Not found", 404);
  if (tx.status !== "pending_guest") fail("This transaction is no longer awaiting your confirmation.");
  tx.status = statusAfterGuestConfirm(tx.exceedsLimit);
  tx.confirmation = { method: "portal", at: now() };
  tx.history.push({ at: now(), by: ctx.actor!.name, action: "Confirmed by guest (portal)" });
  audit(ctx, "transaction", `Confirmed ${tx.code}`, "Method: portal");
  return tx;
});
route("POST", "/transactions/:id/send-otp", ["cashier"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (tx.status !== "pending_guest") fail("This transaction is not awaiting confirmation.");
  const g = findGuest(tx.guestId);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpCodes.set(tx.id, code);
  audit(ctx, "transaction", `Sent confirmation OTP for ${tx.code}`, g.phone.replace(/\d(?=\d{2})/g, "•"));
  return { sentTo: g.phone.replace(/\d(?=\d{2})/g, "•"), demoCode: code };
});
route("POST", "/transactions/:id/confirm-in-hotel", ["cashier"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (tx.status !== "pending_guest") fail("This transaction is not awaiting confirmation.");
  const g = findGuest(tx.guestId);
  const method = ctx.body.method === "otp" ? "otp" : "pin";
  const code = String(ctx.body.code ?? "");
  if (method === "pin" && code !== g.pin) fail("Incorrect PIN. Ask the guest to enter it again.");
  if (method === "otp" && code !== otpCodes.get(tx.id)) fail("Incorrect or expired one-time password.");
  otpCodes.delete(tx.id);
  tx.status = statusAfterGuestConfirm(tx.exceedsLimit);
  tx.confirmation = { method, at: now(), assistedBy: ctx.actor!.name };
  tx.history.push({ at: now(), by: g.fullName, action: `Confirmed by guest in hotel (${method.toUpperCase()})`, note: `Assisted by ${ctx.actor!.name}` });
  audit(ctx, "transaction", `In-hotel confirmation for ${tx.code}`, `Method: ${method.toUpperCase()} · Guest: ${g.fullName}`);
  return tx;
});
route("POST", "/transactions/:id/dispute", ["guest"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (tx.guestId !== ctx.actor!.guestId) fail("Not found", 404);
  if (tx.status !== "pending_guest") fail("This transaction is no longer awaiting your confirmation.");
  const reason = requireReason(ctx.body.reason, "reason for the dispute");
  tx.status = "disputed";
  tx.disputeReason = reason;
  tx.history.push({ at: now(), by: ctx.actor!.name, action: "Disputed by guest", note: reason });
  audit(ctx, "transaction", `Disputed ${tx.code}`, reason);
  return tx;
});
route("POST", "/transactions/:id/cancel", ["cashier"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (!["disputed", "pending_guest", "expired", "pending_price_approval"].includes(tx.status)) fail("This transaction can no longer be cancelled.");
  const reason = requireReason(ctx.body.reason);
  tx.status = "cancelled";
  tx.history.push({ at: now(), by: ctx.actor!.name, action: "Cancelled", note: reason });
  db().priceRequests.forEach((p) => {
    if (p.transactionId === tx.id && p.status === "pending") p.status = "rejected";
  });
  audit(ctx, "transaction", `Cancelled ${tx.code}`, reason);
  return tx;
});
route("POST", "/transactions/:id/approve", ["finance"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (!["pending_finance", "pending_exception"].includes(tx.status)) fail("This transaction is not awaiting finance approval.");
  if (tx.status === "pending_exception") {
    const reason = requireReason(ctx.body.reason, "reason for the exceptional approval");
    tx.exceptionApproval = { approvedBy: ctx.actor!.name, reason, at: now() };
  }
  tx.status = "approved";
  tx.financeDecision = { by: ctx.actor!.name, at: now() };
  tx.history.push({ at: now(), by: ctx.actor!.name, action: tx.exceptionApproval ? "Exceptional credit approved — added to debt" : "Approved — added to debt", note: tx.exceptionApproval?.reason });
  audit(ctx, "transaction", `Approved ${tx.code}${tx.exceptionApproval ? " (exception)" : ""}`, `${tx.guestName} · ${tx.total.toLocaleString()} ETB`);
  return tx;
});
route("POST", "/transactions/:id/reject", ["finance"], (ctx) => {
  const tx = findTx(ctx.params.id);
  if (!["pending_finance", "pending_exception"].includes(tx.status)) fail("This transaction is not awaiting finance approval.");
  const reason = requireReason(ctx.body.reason, "rejection reason");
  tx.status = "rejected";
  tx.rejectionReason = reason;
  tx.financeDecision = { by: ctx.actor!.name, at: now() };
  tx.history.push({ at: now(), by: ctx.actor!.name, action: "Rejected by Finance", note: reason });
  audit(ctx, "transaction", `Rejected ${tx.code}`, reason);
  return tx;
});

// ---------------------------------------------------------------- payments
route("GET", "/payments", ["finance", "guest"], (ctx) => {
  let list = db().payments;
  if (ctx.actor!.role === "guest") list = list.filter((p) => p.guestId === ctx.actor!.guestId);
  if (ctx.query.guestId) list = list.filter((p) => p.guestId === ctx.query.guestId);
  if (ctx.query.method) list = list.filter((p) => p.method === ctx.query.method);
  return list;
});
route("POST", "/payments", ["finance"], (ctx) => {
  const s = db();
  const g = findGuest(String(ctx.body.guestId ?? ""));
  const amount = roundMoney(Number(ctx.body.amount));
  if (!Number.isFinite(amount) || amount <= 0) fail("Enter a valid payment amount.");
  const method = ctx.body.method;
  if (!["cash", "bank_transfer"].includes(method)) fail("Choose cash or bank transfer.");
  const reference = String(ctx.body.reference ?? "").trim();
  if (method === "bank_transfer" && !reference) fail("Bank transfers need a reference number.");
  const acc = guestAccount(g);
  if (amount > acc.outstandingDebt) fail(`Amount exceeds the outstanding debt of ${acc.outstandingDebt.toLocaleString()} ETB.`);
  const verified = ctx.body.verified !== false;
  const n = s.counters.receipt++;
  const p: Payment = {
    id: nextId("p"),
    receiptNumber: `HRN-RCPT-${String(n).padStart(6, "0")}`,
    guestId: g.id,
    guestName: g.fullName,
    amount,
    method,
    reference: reference || undefined,
    bankName: String(ctx.body.bankName ?? "").trim() || undefined,
    paidAt: ctx.body.paidAt ? new Date(ctx.body.paidAt).toISOString() : now(),
    recordedBy: ctx.actor!.name,
    verified,
    balanceBefore: acc.outstandingDebt,
    balanceAfter: verified ? roundMoney(acc.outstandingDebt - amount) : acc.outstandingDebt,
    note: String(ctx.body.note ?? "").trim() || undefined,
  };
  s.payments.unshift(p);
  if (verified) notify(g.id, "Payment received", `${amount.toLocaleString()} ETB recorded. Receipt ${p.receiptNumber} is ready.`);
  audit(ctx, "payment", `Recorded ${method === "cash" ? "cash" : "bank transfer"} payment${verified ? "" : " (awaiting verification)"}`, `${g.fullName} · ${amount.toLocaleString()} ETB`);
  return p;
});
route("POST", "/payments/:id/verify", ["finance"], (ctx) => {
  const s = db();
  const p = s.payments.find((x) => x.id === ctx.params.id) ?? fail("Payment not found", 404);
  if (p!.verified) fail("Already verified.");
  const acc = guestAccount(findGuest(p!.guestId));
  if (p!.amount > acc.outstandingDebt) fail("Payment is larger than the current outstanding debt.");
  p!.verified = true;
  p!.balanceBefore = acc.outstandingDebt;
  p!.balanceAfter = roundMoney(acc.outstandingDebt - p!.amount);
  notify(p!.guestId, "Payment received", `${p!.amount.toLocaleString()} ETB verified. Receipt ${p!.receiptNumber} is ready.`);
  audit(ctx, "payment", "Verified payment", `${p!.receiptNumber}`);
  return p;
});
route("GET", "/payments/:id", ["finance", "guest"], (ctx) => {
  const p = db().payments.find((x) => x.id === ctx.params.id) ?? fail("Payment not found", 404);
  if (ctx.actor!.role === "guest" && p!.guestId !== ctx.actor!.guestId) fail("Not found", 404);
  return p;
});

// ---------------------------------------------------------------- historical debts
route("GET", "/historical-debts", ["finance"], () => db().historical);
function reconciliation(s = db()) {
  const sum = (st: string) => roundMoney(s.historical.filter((h) => h.status === st).reduce((a, h) => a + h.amount, 0));
  const approved = sum("approved");
  const pending = sum("pending_verification");
  return {
    target: s.settings.historicalDebtTarget,
    approved,
    pending,
    rejected: sum("rejected"),
    imported: roundMoney(approved + pending),
    difference: roundMoney(s.settings.historicalDebtTarget - approved - pending),
    records: s.historical.length,
  };
}
route("GET", "/historical-debts/reconciliation", ["finance"], () => reconciliation());
route("POST", "/historical-debts", ["finance"], (ctx) => {
  const s = db();
  const g = findGuest(String(ctx.body.guestId ?? ""));
  const amount = roundMoney(Number(ctx.body.amount));
  if (!Number.isFinite(amount) || amount <= 0) fail("Enter a valid amount.");
  const ref = String(ctx.body.sourceReference ?? "").trim();
  if (!ref) fail("Enter the source reference (ledger, page, slip number).");
  const h = { id: nextId("h"), guestId: g.id, guestName: g.fullName, amount, sourceReference: ref, evidenceNote: String(ctx.body.evidenceNote ?? "").trim() || undefined, originalDate: ctx.body.originalDate ? new Date(ctx.body.originalDate).toISOString() : now(), status: "pending_verification" as const, enteredBy: ctx.actor!.name, enteredAt: now() };
  s.historical.unshift(h);
  audit(ctx, "historical", "Entered historical debt", `${g.fullName} · ${amount.toLocaleString()} ETB`);
  return h;
});
route("POST", "/historical-debts/import", ["finance"], (ctx) => {
  const s = db();
  const rows = Array.isArray(ctx.body.rows) ? ctx.body.rows : fail("No rows to import.");
  const created: string[] = [];
  const errors: string[] = [];
  (rows as any[]).forEach((row, i) => {
    const g = s.guests.find((x) => x.username === String(row.username ?? "").trim().toLowerCase());
    const amount = Number(row.amount);
    if (!g) {
      errors.push(`Row ${i + 1}: unknown guest username "${row.username}"`);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Row ${i + 1}: invalid amount`);
      return;
    }
    s.historical.unshift({ id: nextId("h"), guestId: g.id, guestName: g.fullName, amount: roundMoney(amount), sourceReference: String(row.sourceReference || "Bulk import"), originalDate: row.originalDate ? new Date(row.originalDate).toISOString() : now(), status: "pending_verification", enteredBy: ctx.actor!.name, enteredAt: now() });
    created.push(g.fullName);
  });
  audit(ctx, "historical", "Imported historical debts", `${created.length} rows, ${errors.length} errors`);
  return { created: created.length, errors };
});
function decideHistorical(ctx: Ctx, approve: boolean) {
  const h = db().historical.find((x) => x.id === ctx.params.id) ?? fail("Record not found", 404);
  if (h!.status !== "pending_verification") fail("This record was already verified.");
  h!.status = approve ? "approved" : "rejected";
  h!.verifiedBy = ctx.actor!.name;
  h!.verifiedAt = now();
  audit(ctx, "historical", approve ? "Approved opening balance" : "Rejected historical record", `${h!.guestName} · ${h!.amount.toLocaleString()} ETB`);
  return h;
}
route("POST", "/historical-debts/:id/approve", ["finance"], (ctx) => decideHistorical(ctx, true));
route("POST", "/historical-debts/:id/reject", ["finance"], (ctx) => decideHistorical(ctx, false));

// ---------------------------------------------------------------- reports
function periodRange(period: ReportPeriod) {
  const to = new Date();
  const from = new Date();
  if (period === "daily") from.setHours(0, 0, 0, 0);
  else if (period === "weekly") from.setTime(to.getTime() - 7 * DAY);
  else if (period === "monthly") from.setTime(to.getTime() - 30 * DAY);
  else from.setTime(to.getTime() - 365 * DAY);
  return { from, to };
}
function seriesFor(period: ReportPeriod, s = db()) {
  if (period === "monthly" || period === "yearly") return monthlySeries(period === "yearly" ? 12 : 6, s);
  const buckets = period === "daily" ? 14 : 8;
  const size = period === "daily" ? DAY : 7 * DAY;
  return [...Array(buckets)].map((_, i) => {
    const end = Date.now() - (buckets - 1 - i) * size;
    const start = end - size;
    const inRange = (d: string) => Date.parse(d) > start && Date.parse(d) <= end;
    return {
      label: new Date(end).toLocaleDateString("en", { month: "short", day: "numeric" }),
      credit: roundMoney(s.transactions.filter((t) => t.status === "approved" && inRange(t.createdAt)).reduce((a, t) => a + t.total, 0)),
      payments: roundMoney(s.payments.filter((p) => p.verified && inRange(p.paidAt)).reduce((a, p) => a + p.amount, 0)),
    };
  });
}
const TITLES: Record<ReportType, string> = {
  summary: "Financial summary",
  guest_debt: "Guest debt report",
  payments: "Payment report",
  outstanding: "Outstanding debt report",
  credit_transactions: "Credit transaction report",
  historical: "Historical debt report",
};
route("GET", "/reports", ["finance"], (ctx): ReportResult => {
  const s = db();
  const type = (ctx.query.type as ReportType) || "summary";
  const period = (ctx.query.period as ReportPeriod) || "monthly";
  const { from, to } = periodRange(period);
  const inRange = (d: string) => Date.parse(d) >= from.getTime() && Date.parse(d) <= to.getTime();
  const series = seriesFor(period, s);
  const base = { title: `${TITLES[type]} · ${period.charAt(0).toUpperCase()}${period.slice(1)}`, period, from: from.toISOString(), to: to.toISOString(), series };
  const accounts = s.guests.map((g) => guestAccount(g, s));
  switch (type) {
    case "guest_debt":
      return { ...base, columns: [
        { key: "guest", label: "Guest" }, { key: "phone", label: "Phone" }, { key: "limit", label: "Credit limit", money: true },
        { key: "historical", label: "Historical", money: true }, { key: "credit", label: "Approved credit", money: true },
        { key: "payments", label: "Payments", money: true }, { key: "outstanding", label: "Outstanding", money: true },
      ], rows: accounts.map((a) => ({ guest: a.fullName, phone: a.phone, limit: a.creditLimit, historical: a.historicalDebt, credit: a.approvedCredit, payments: a.totalPayments, outstanding: a.outstandingDebt })),
      totals: [{ label: "Total outstanding", value: roundMoney(accounts.reduce((x, a) => x + a.outstandingDebt, 0)) }] };
    case "payments": {
      const list = s.payments.filter((p) => inRange(p.paidAt));
      return { ...base, columns: [
        { key: "date", label: "Date" }, { key: "receipt", label: "Receipt" }, { key: "guest", label: "Guest" },
        { key: "method", label: "Method" }, { key: "reference", label: "Reference" }, { key: "amount", label: "Amount", money: true }, { key: "by", label: "Recorded by" },
      ], rows: list.map((p) => ({ date: p.paidAt.slice(0, 10), receipt: p.receiptNumber, guest: p.guestName, method: p.method === "cash" ? "Cash" : "Bank transfer", reference: p.reference ?? "—", amount: p.amount, by: p.recordedBy })),
      totals: [
        { label: "Total received", value: roundMoney(list.filter((p) => p.verified).reduce((a, p) => a + p.amount, 0)) },
        { label: "Cash", value: roundMoney(list.filter((p) => p.method === "cash").reduce((a, p) => a + p.amount, 0)) },
        { label: "Bank transfer", value: roundMoney(list.filter((p) => p.method === "bank_transfer").reduce((a, p) => a + p.amount, 0)) },
      ] };
    }
    case "outstanding": {
      const list = accounts.filter((a) => a.outstandingDebt > 0).sort((a, b) => b.outstandingDebt - a.outstandingDebt);
      return { ...base, columns: [
        { key: "guest", label: "Guest" }, { key: "limit", label: "Credit limit", money: true }, { key: "outstanding", label: "Outstanding", money: true },
        { key: "available", label: "Available", money: true }, { key: "status", label: "Limit status" },
      ], rows: list.map((a) => ({ guest: a.fullName, limit: a.creditLimit, outstanding: a.outstandingDebt, available: a.availableCredit, status: a.exceedsLimit ? "Exceeded" : "Within limit" })),
      totals: [{ label: "Total outstanding", value: roundMoney(list.reduce((x, a) => x + a.outstandingDebt, 0)) }, { label: "Guests over limit", value: list.filter((a) => a.exceedsLimit).length }] };
    }
    case "credit_transactions": {
      const list = s.transactions.filter((t) => inRange(t.createdAt));
      return { ...base, columns: [
        { key: "date", label: "Date" }, { key: "code", label: "Transaction" }, { key: "guest", label: "Guest" },
        { key: "services", label: "Services" }, { key: "status", label: "Status" }, { key: "amount", label: "Amount", money: true },
      ], rows: list.map((t) => ({ date: t.createdAt.slice(0, 10), code: t.code, guest: t.guestName, services: t.items.map((i) => `${i.serviceName} ×${i.quantity}`).join(", "), status: t.status.replace(/_/g, " "), amount: t.total })),
      totals: [
        { label: "Approved", value: roundMoney(list.filter((t) => t.status === "approved").reduce((a, t) => a + t.total, 0)) },
        { label: "Pending", value: roundMoney(list.filter((t) => RESERVING_STATUSES.includes(t.status)).reduce((a, t) => a + t.total, 0)) },
        { label: "Rejected", value: roundMoney(list.filter((t) => t.status === "rejected").reduce((a, t) => a + t.total, 0)) },
      ] };
    }
    case "historical": {
      const rec = reconciliation(s);
      return { ...base, columns: [
        { key: "guest", label: "Guest" }, { key: "reference", label: "Source reference" }, { key: "date", label: "Original date" },
        { key: "status", label: "Status" }, { key: "amount", label: "Amount", money: true },
      ], rows: s.historical.map((h) => ({ guest: h.guestName, reference: h.sourceReference, date: h.originalDate.slice(0, 10), status: h.status.replace(/_/g, " "), amount: h.amount })),
      totals: [{ label: "Approved opening balances", value: rec.approved }, { label: "Pending verification", value: rec.pending }, { label: "Unreconciled vs target", value: rec.difference }] };
    }
    default: {
      const rows = series.map((b) => ({ period: b.label, credit: b.credit, payments: b.payments, net: roundMoney(b.credit - b.payments) }));
      return { ...base, columns: [
        { key: "period", label: "Period" }, { key: "credit", label: "Approved credit", money: true }, { key: "payments", label: "Payments", money: true }, { key: "net", label: "Net change", money: true },
      ], rows, totals: [
        { label: "Approved credit", value: roundMoney(rows.reduce((a, r) => a + r.credit, 0)) },
        { label: "Payments received", value: roundMoney(rows.reduce((a, r) => a + r.payments, 0)) },
        { label: "Total outstanding", value: roundMoney(accounts.reduce((x, a) => x + a.outstandingDebt, 0)) },
      ] };
    }
  }
});

// ---------------------------------------------------------------- guest self-service
route("GET", "/me/account", ["guest"], (ctx) => guestAccount(findGuest(ctx.actor!.guestId!)));
route("GET", "/me/statement", ["guest"], (ctx) => {
  const s = db();
  const g = findGuest(ctx.actor!.guestId!);
  return {
    account: guestAccount(g),
    historical: s.historical.filter((h) => h.guestId === g.id && h.status === "approved"),
    transactions: s.transactions.filter((t) => t.guestId === g.id && t.status === "approved"),
    payments: s.payments.filter((p) => p.guestId === g.id && p.verified),
  };
});
route("GET", "/me/notifications", ["guest"], (ctx) => db().notifications[ctx.actor!.guestId!] ?? []);
route("POST", "/me/notifications/read", ["guest"], (ctx) => {
  (db().notifications[ctx.actor!.guestId!] ?? []).forEach((n) => (n.read = true));
  return { ok: true };
});

// ---------------------------------------------------------------- admin system
route("GET", "/settings", [], () => db().settings);
route("PUT", "/settings", ["admin"], (ctx) => {
  const s = db();
  const next = { ...s.settings, ...ctx.body };
  next.confirmationDeadlineHours = Number(next.confirmationDeadlineHours);
  next.reminderBeforeHours = Number(next.reminderBeforeHours);
  next.historicalDebtTarget = Number(next.historicalDebtTarget);
  if (!(next.confirmationDeadlineHours >= 1)) fail("Confirmation deadline must be at least 1 hour.");
  if (next.reminderBeforeHours >= next.confirmationDeadlineHours) fail("Reminder must be sent before the deadline.");
  s.settings = next;
  audit(ctx, "settings", "Updated system settings");
  return s.settings;
});
route("GET", "/audit-logs", ["admin"], (ctx) => {
  let list = db().audit;
  if (ctx.query.category) list = list.filter((a) => a.category === ctx.query.category);
  if (ctx.query.search) {
    const q = String(ctx.query.search).toLowerCase();
    list = list.filter((a) => `${a.actor} ${a.action} ${a.details ?? ""}`.toLowerCase().includes(q));
  }
  return list.slice(0, 300);
});
route("GET", "/backups", ["admin"], () => db().backups);
route("POST", "/backups", ["admin"], (ctx) => {
  const s = db();
  const { sessions: _s, ...snapshot } = s;
  const json = JSON.stringify(snapshot);
  const b = { id: nextId("b"), createdAt: now(), createdBy: ctx.actor!.name, sizeKb: Math.round(json.length / 1024) };
  s.backups.unshift(b);
  audit(ctx, "backup", "Created database backup", `${b.sizeKb} KB`);
  return { backup: b, snapshot };
});
route("POST", "/backups/restore", ["admin"], (ctx) => {
  const snap = ctx.body.snapshot as DemoState | undefined;
  if (!snap || snap.version !== DEMO_VERSION || !Array.isArray(snap.transactions) || !Array.isArray(snap.guests)) fail("This file is not a valid DCMS backup.");
  const sessions = db().sessions;
  replaceState({ ...snap!, sessions });
  audit(ctx, "backup", "Restored database from backup");
  return { ok: true };
});

// ---------------------------------------------------------------- dispatcher
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function demoRequest<T>(method: HttpMethod, path: string, body?: unknown, query?: Query): Promise<T> {
  if (import.meta.env.MODE !== "test") await sleep(180 + Math.random() * 260);
  const s = db();
  const [cleanPath = "", qs = ""] = path.split("?");
  const q: Query = { ...Object.fromEntries(new URLSearchParams(qs ?? "")), ...(query ?? {}) };
  const def = routes.find((r) => r.method === method && r.re.test(cleanPath));
  if (!def) throw new ApiError(`No demo endpoint for ${method} ${cleanPath}`, 404);
  const m = cleanPath.match(def.re)!;
  const params = Object.fromEntries(def.keys.map((k, i) => [k, decodeURIComponent(m[i + 1] ?? "")]));

  const token = readSession()?.token;
  let actor: Actor | null = null;
  const userId = token ? s.sessions[token] : undefined;
  if (userId) {
    const staff = s.staff.find((u) => u.id === userId);
    const guest = s.guests.find((u) => u.id === userId);
    if (staff && staff.status === "active") actor = { id: staff.id, role: staff.role, name: staff.fullName };
    if (guest && guest.status === "active") actor = { id: guest.id, role: "guest", name: guest.fullName, guestId: guest.id };
  }
  if (def.roles) {
    if (!actor) {
      const { UNAUTHORIZED_EVENT, writeSession } = await import("../session");
      writeSession(null);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      throw new ApiError("Your session has ended. Please sign in again.", 401);
    }
    if (def.roles.length && !def.roles.includes(actor.role)) throw new ApiError("You do not have permission to do this.", 403);
  }
  sweepDeadlines();
  const result = def.handler({ actor, body: (body ?? {}) as Record<string, any>, query: q, params, token });
  if (method !== "GET") persist();
  // Return a deep copy so UI mutations never touch the store.
  return JSON.parse(JSON.stringify(result ?? null)) as T;
}

export type { Payment };
