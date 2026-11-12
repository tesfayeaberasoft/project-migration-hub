// Demo data for the in-browser backend. Mirrors realistic Haroni Hotel operations.
import { RESERVING_STATUSES, lineTotal, outstandingDebt, roundMoney } from "@/lib/credit";
import type {
  AuditLog,
  CreditLimitChange,
  CreditTransaction,
  Guest,
  HistoricalDebt,
  HotelService,
  Notification,
  Payment,
  PriceRequest,
  StaffUser,
  SystemSettings,
  TransactionItem,
} from "@/types";

export interface DemoStaff extends StaffUser {
  password: string;
}
export interface DemoGuest extends Guest {
  password: string;
  pin: string;
}

export interface DemoState {
  version: number;
  staff: DemoStaff[];
  guests: DemoGuest[];
  services: HotelService[];
  transactions: CreditTransaction[];
  payments: Payment[];
  historical: HistoricalDebt[];
  priceRequests: PriceRequest[];
  limitChanges: CreditLimitChange[];
  audit: AuditLog[];
  settings: SystemSettings;
  notifications: Record<string, Notification[]>;
  sessions: Record<string, string>;
  backups: { id: string; createdAt: string; createdBy: string; sizeKb: number }[];
  counters: { tx: number; receipt: number; id: number };
}

export const DEMO_VERSION = 3;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

export function buildSeed(now = Date.now()): DemoState {
  const r = rng(20261112);
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const pick = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)]!;

  const staff: DemoStaff[] = [
    { id: "u-admin", fullName: "Selam Tesfaye", username: "admin", password: "admin123", phone: "+251 911 200 300", role: "admin", status: "active", createdAt: iso(400 * DAY) },
    { id: "u-cashier", fullName: "Dawit Bekele", username: "cashier", password: "cashier123", phone: "+251 912 410 552", role: "cashier", status: "active", createdAt: iso(380 * DAY) },
    { id: "u-cashier2", fullName: "Hanna Girma", username: "hanna", password: "cashier123", phone: "+251 913 778 019", role: "cashier", status: "active", createdAt: iso(200 * DAY) },
    { id: "u-finance", fullName: "Meron Alemu", username: "finance", password: "finance123", phone: "+251 911 905 117", role: "finance", status: "active", createdAt: iso(390 * DAY) },
    { id: "u-cashier3", fullName: "Naod Fikre", username: "naod", password: "cashier123", phone: "+251 914 003 221", role: "cashier", status: "inactive", createdAt: iso(320 * DAY) },
  ];

  const g = (id: string, fullName: string, username: string, phone: string, creditLimit: number, status: Guest["status"] = "active"): DemoGuest => ({
    id, fullName, username, phone, creditLimit, status, password: "guest123", pin: "1234", createdAt: iso(300 * DAY),
  });
  const guests: DemoGuest[] = [
    g("g-01", "Abebe Kebede", "abebe", "+251 911 234 567", 150_000),
    g("g-02", "Tigist Haile", "tigist", "+251 912 345 678", 1_500_000),
    g("g-03", "Yonas Mengistu", "yonas", "+251 913 456 789", 1_000_000),
    g("g-04", "Selamawit Desta", "selamawit", "+251 914 567 890", 60_000),
    g("g-05", "Mulugeta Assefa", "mulugeta", "+251 915 678 901", 2_000_000),
    g("g-06", "Hirut Wolde", "hirut", "+251 916 789 012", 1_500_000),
    g("g-07", "Bereket Tadesse", "bereket", "+251 917 890 123", 1_800_000),
    g("g-08", "Liya Getachew", "liya", "+251 918 901 234", 80_000),
    g("g-09", "Samuel Negash", "samuel", "+251 919 012 345", 1_400_000),
    g("g-10", "Eden Mekonnen", "eden", "+251 920 123 456", 50_000),
    g("g-11", "Kidus Alemayehu", "kidus", "+251 921 234 567", 750_000),
    g("g-12", "Rahel Abate", "rahel", "+251 922 345 678", 700_000, "inactive"),
  ];

  const svc = (id: string, name: string, category: HotelService["category"], price: number, available = true): HotelService => ({
    id, name, category, price, available, priceHistory: [{ price, effectiveFrom: iso(365 * DAY), approvedBy: "Meron Alemu" }],
  });
  const services: HotelService[] = [
    svc("s-01", "Breakfast Buffet", "food", 650),
    svc("s-02", "Doro Wat Platter", "food", 850),
    svc("s-03", "Special Kitfo", "food", 950),
    svc("s-04", "Beef Tibs", "food", 780),
    svc("s-05", "Shiro Tegabino", "food", 420),
    svc("s-06", "Club Sandwich", "food", 550),
    svc("s-07", "Macchiato", "drinks", 90),
    svc("s-08", "Fresh Avocado Juice", "drinks", 180),
    svc("s-09", "Ambo Mineral Water", "drinks", 60),
    svc("s-10", "St. George Beer", "drinks", 120),
    svc("s-11", "Honey Wine (Tej)", "drinks", 250),
    svc("s-12", "Red Wine Bottle", "drinks", 1_800),
    svc("s-13", "Standard Room (per night)", "accommodation", 4_500),
    svc("s-14", "Deluxe Room (per night)", "accommodation", 6_800),
    svc("s-15", "Executive Suite (per night)", "accommodation", 11_500),
    svc("s-16", "Laundry Service", "other", 350),
    svc("s-17", "Airport Transfer", "other", 1_200),
    svc("s-18", "Conference Hall (half day)", "other", 15_000),
    svc("s-19", "Spa Massage", "other", 2_200, false),
  ];
  services[16]!.proposedPrice = 1_400;

  let txCounter = 1040;
  let receiptCounter = 520;
  const cashiers = ["Dawit Bekele", "Hanna Girma"];

  const makeItems = (big = false): TransactionItem[] => {
    const count = 1 + Math.floor(r() * 3);
    const pool = big ? services.filter((s) => s.available) : services.filter((s) => s.available && s.category !== "accommodation" && s.price < 5000);
    const chosen = new Set<HotelService>();
    while (chosen.size < count) chosen.add(pick(pool));
    return [...chosen].map((s) => {
      const quantity = s.category === "accommodation" ? 1 + Math.floor(r() * 3) : 1 + Math.floor(r() * 4);
      return { serviceId: s.id, serviceName: s.name, category: s.category, quantity, unitPrice: s.price, catalogPrice: s.price, total: lineTotal(quantity, s.price) };
    });
  };

  const transactions: CreditTransaction[] = [];
  const addTx = (guest: DemoGuest, msAgo: number, status: CreditTransaction["status"], extra: Partial<CreditTransaction> = {}, items = makeItems(r() > 0.6)) => {
    const total = roundMoney(items.reduce((s, i) => s + i.total, 0));
    const createdAt = iso(msAgo);
    const by = pick(cashiers);
    const tx: CreditTransaction = {
      id: `t-${txCounter}`,
      code: `HTX-${txCounter}`,
      guestId: guest.id,
      guestName: guest.fullName,
      items,
      total,
      consumptionDate: createdAt,
      createdAt,
      createdBy: by,
      status,
      exceedsLimit: false,
      excessAmount: 0,
      revision: 1,
      history: [{ at: createdAt, by, action: "Recorded and submitted to guest" }],
      ...extra,
    };
    if (["pending_finance", "pending_exception", "approved", "rejected"].includes(status)) {
      const at = new Date(Date.parse(createdAt) + 3 * 3600_000).toISOString();
      tx.confirmation = { method: r() > 0.8 ? "pin" : "portal", at };
      tx.history.push({ at, by: guest.fullName, action: "Confirmed by guest" });
    }
    if (status === "approved" || status === "rejected") {
      const at = new Date(Date.parse(createdAt) + 20 * 3600_000).toISOString();
      tx.financeDecision = { by: "Meron Alemu", at };
      tx.history.push({ at, by: "Meron Alemu", action: status === "approved" ? "Approved by Finance" : "Rejected by Finance", note: tx.rejectionReason });
    }
    txCounter++;
    transactions.push(tx);
    return tx;
  };

  // Six months of approved activity for every active guest.
  for (const guest of guests) {
    const small = guest.creditLimit < 200_000;
    for (let m = small ? 2 : 5; m >= 0; m--) {
      const n = small ? 1 : 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const msAgo = m * 30 * DAY + Math.floor(r() * 26 + 3) * DAY;
        addTx(guest, msAgo, "approved", {}, makeItems(!small && r() > 0.5));
      }
    }
  }
  const byId = (id: string) => guests.find((x) => x.id === id)!;
  const it = (id: string, quantity: number, priceOverride?: number): TransactionItem => {
    const s = services.find((x) => x.id === id)!;
    const unit = priceOverride ?? s.price;
    return { serviceId: s.id, serviceName: s.name, category: s.category, quantity, unitPrice: unit, catalogPrice: s.price, total: lineTotal(quantity, unit) };
  };

  // Workflow scenarios.
  addTx(byId("g-01"), 2 * 3600_000, "pending_guest", { confirmationDeadline: iso(-22 * 3600_000) }, [it("s-02", 2), it("s-11", 2), it("s-07", 3)]);
  addTx(byId("g-01"), 5 * 3600_000, "pending_guest", { confirmationDeadline: iso(-19 * 3600_000) }, [it("s-14", 1), it("s-01", 2)]);
  addTx(byId("g-01"), 9 * DAY, "rejected", { rejectionReason: "Duplicate of HTX-1031 recorded on the same day." }, [it("s-04", 2)]);
  addTx(byId("g-03"), 26 * 3600_000, "disputed", {
    disputeReason: "I only had one Special Kitfo, not two. The juice was not mine.",
    history: [
      { at: iso(26 * 3600_000), by: "Dawit Bekele", action: "Recorded and submitted to guest" },
      { at: iso(24 * 3600_000), by: "Yonas Mengistu", action: "Disputed by guest", note: "I only had one Special Kitfo, not two. The juice was not mine." },
    ],
  }, [it("s-03", 2), it("s-08", 2)]);
  addTx(byId("g-02"), 30 * 3600_000, "pending_finance", {}, [it("s-15", 2), it("s-12", 1)]);
  addTx(byId("g-06"), 20 * 3600_000, "pending_finance", {}, [it("s-01", 4), it("s-16", 2)]);
  addTx(byId("g-09"), 16 * 3600_000, "pending_finance", {}, [it("s-17", 1), it("s-06", 2), it("s-10", 4)]);
  addTx(byId("g-05"), 18 * 3600_000, "pending_exception", { exceedsLimit: true }, [it("s-18", 1), it("s-01", 20)]);
  addTx(byId("g-04"), 12 * 3600_000, "pending_exception", { exceedsLimit: true }, [it("s-15", 5), it("s-02", 3)]);
  addTx(byId("g-11"), 4 * 3600_000, "pending_guest", { confirmationDeadline: iso(-20 * 3600_000) }, [it("s-13", 2), it("s-05", 2)]);
  addTx(byId("g-08"), 3 * DAY, "expired", { confirmationDeadline: iso(2 * DAY) }, [it("s-10", 6)]);
  const priceTx = addTx(byId("g-02"), 1 * 3600_000, "pending_price_approval", {}, [it("s-18", 1, 12_000), it("s-09", 30)]);
  priceTx.items[0]!.priceRequest = { requestedPrice: 12_000, reason: "Agreed corporate event rate for returning guest.", status: "pending" };
  priceTx.history[0] = { at: priceTx.createdAt, by: priceTx.createdBy, action: "Recorded with a price change request" };

  const historical: HistoricalDebt[] = [];
  const hist: [string, number, HistoricalDebt["status"]][] = [
    ["g-01", 62_000, "approved"], ["g-02", 1_180_000, "approved"], ["g-03", 845_500, "approved"],
    ["g-05", 2_450_000, "approved"], ["g-06", 1_320_000, "approved"], ["g-07", 1_975_000, "approved"],
    ["g-09", 1_240_000, "approved"], ["g-11", 680_000, "approved"], ["g-12", 672_500, "approved"],
    ["g-08", 212_500, "pending_verification"], ["g-10", 200_000, "pending_verification"],
  ];
  hist.forEach(([gid, amount, status], i) => {
    const guest = byId(gid);
    historical.push({
      id: `h-${i + 1}`,
      guestId: gid,
      guestName: guest.fullName,
      amount,
      sourceReference: `Manual ledger ${2023 + (i % 2)} · Vol ${1 + (i % 3)} · p.${12 + i * 7}`,
      evidenceNote: status === "approved" ? "Signed credit slips scanned and filed." : "Awaiting cross-check with archived slips.",
      originalDate: iso((420 + i * 15) * DAY),
      status,
      enteredBy: "Meron Alemu",
      enteredAt: iso((200 - i) * DAY),
      ...(status === "approved" ? { verifiedBy: "Meron Alemu", verifiedAt: iso((190 - i) * DAY) } : {}),
    });
  });

  // Payments: partial payments spread over the last six months.
  const payments: Payment[] = [];
  for (const guest of guests) {
    const n = Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const msAgo = Math.floor(r() * 170 + 2) * DAY;
      const method = r() > 0.45 ? "bank_transfer" : "cash";
      const amount = Math.round((guest.creditLimit > 500_000 ? 40_000 + r() * 180_000 : 4_000 + r() * 18_000) / 100) * 100;
      payments.push({
        id: `p-${receiptCounter}`,
        receiptNumber: `HRN-RCPT-${String(receiptCounter).padStart(6, "0")}`,
        guestId: guest.id,
        guestName: guest.fullName,
        amount,
        method,
        reference: method === "bank_transfer" ? `FT${Math.floor(10_000_000 + r() * 89_999_999)}` : undefined,
        bankName: method === "bank_transfer" ? pick(["Commercial Bank of Ethiopia", "Awash Bank", "Dashen Bank", "Bank of Abyssinia"]) : undefined,
        paidAt: iso(msAgo),
        recordedBy: "Meron Alemu",
        verified: true,
        balanceBefore: 0,
        balanceAfter: 0,
      });
      receiptCounter++;
    }
  }
  // Running balances at the time of each payment.
  payments.sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  const dropped = new Set<string>();
  for (const p of payments) {
    const t = Date.parse(p.paidAt);
    const txs = transactions.filter((x) => x.guestId === p.guestId && Date.parse(x.createdAt) <= t);
    const pays = payments.filter((x) => x.guestId === p.guestId && Date.parse(x.paidAt) < t && !dropped.has(x.id));
    const hs = historical.filter((x) => x.guestId === p.guestId && x.status === "approved");
    p.balanceBefore = outstandingDebt(txs, pays, hs);
    if (p.balanceBefore < 2_000) {
      dropped.add(p.id);
      continue;
    }
    if (p.amount > p.balanceBefore) p.amount = Math.round((p.balanceBefore * 0.6) / 100) * 100;
    p.balanceAfter = roundMoney(p.balanceBefore - p.amount);
  }
  const keptPayments = payments.filter((p) => !dropped.has(p.id));

  // Over-limit scenarios: record by how much each exceeded the guest's available credit.
  for (const tx of transactions.filter((x) => x.status === "pending_exception")) {
    const guest = byId(tx.guestId);
    const others = transactions.filter((x) => x.guestId === guest.id);
    const debt = outstandingDebt(others, keptPayments.filter((p) => p.guestId === guest.id), historical.filter((h) => h.guestId === guest.id));
    const reserved = others.filter((x) => x.id !== tx.id && RESERVING_STATUSES.includes(x.status)).reduce((a, x) => a + x.total, 0);
    const available = Math.max(0, guest.creditLimit - debt - reserved);
    tx.excessAmount = roundMoney(Math.max(0, tx.total - available));
  }

  const priceRequests: PriceRequest[] = [
    {
      id: "pr-1", kind: "transaction", serviceId: "s-18", serviceName: "Conference Hall (half day)", currentPrice: 15_000, requestedPrice: 12_000,
      reason: "Agreed corporate event rate for returning guest.", requestedBy: priceTx.createdBy, requestedAt: priceTx.createdAt,
      transactionId: priceTx.id, transactionCode: priceTx.code, status: "pending",
    },
    {
      id: "pr-2", kind: "catalog", serviceId: "s-17", serviceName: "Airport Transfer", currentPrice: 1_200, requestedPrice: 1_400,
      reason: "Fuel price adjustment effective this quarter.", requestedBy: "Selam Tesfaye", requestedAt: iso(2 * DAY), status: "pending",
    },
  ];

  const limitChanges: CreditLimitChange[] = [
    { id: "cl-1", guestId: "g-01", guestName: "Abebe Kebede", previousLimit: 100_000, newLimit: 150_000, reason: "Consistent on-time payments over 6 months.", changedBy: "Meron Alemu", changedAt: iso(40 * DAY) },
    { id: "cl-2", guestId: "g-05", guestName: "Mulugeta Assefa", previousLimit: 2_500_000, newLimit: 2_000_000, reason: "Reduced pending settlement of historical balance.", changedBy: "Meron Alemu", changedAt: iso(60 * DAY) },
  ];

  const audit: AuditLog[] = [];
  const log = (msAgo: number, actor: string, role: AuditLog["role"], category: AuditLog["category"], action: string, details?: string) =>
    audit.push({ id: `a-${audit.length + 1}`, at: iso(msAgo), actor, role, category, action, details });
  log(3 * 3600_000, "Dawit Bekele", "cashier", "auth", "Signed in");
  log(2 * 3600_000, "Dawit Bekele", "cashier", "transaction", "Recorded HTX transaction", "Abebe Kebede · Doro Wat Platter ×2");
  log(24 * 3600_000, "Yonas Mengistu", "guest", "transaction", "Disputed transaction", "Reason provided");
  log(26 * 3600_000, "Meron Alemu", "finance", "payment", "Recorded bank transfer payment");
  log(2 * DAY, "Selam Tesfaye", "admin", "catalog", "Proposed price change", "Airport Transfer 1,200 → 1,400 ETB");
  log(3 * DAY, "Selam Tesfaye", "admin", "user", "Deactivated user", "Naod Fikre (cashier)");
  log(5 * DAY, "Selam Tesfaye", "admin", "settings", "Updated confirmation deadline", "24 hours");
  log(6 * DAY, "Meron Alemu", "finance", "historical", "Approved opening balance", "Rahel Abate · 672,500 ETB");
  log(7 * DAY, "System", "system", "backup", "Automatic nightly backup completed");
  audit.reverse();

  const settings: SystemSettings = {
    hotelName: "Haroni Hotel",
    hotelAddress: "Bole Road, Addis Ababa, Ethiopia",
    hotelPhone: "+251 11 661 2020",
    hotelEmail: "finance@haronihotel.com",
    hotelTin: "0012345678",
    currency: "ETB",
    confirmationDeadlineHours: 24,
    reminderBeforeHours: 4,
    historicalDebtTarget: 11_000_000,
    receiptFooter: "Thank you for choosing Haroni Hotel. This receipt is system generated.",
    smsRemindersEnabled: true,
  };

  const notifications: Record<string, Notification[]> = {
    "g-01": [
      { id: "n-1", at: iso(2 * 3600_000), title: "New transaction to confirm", body: "Dawit Bekele recorded a new credit transaction. Please review and confirm.", read: false },
      { id: "n-2", at: iso(5 * 3600_000), title: "New transaction to confirm", body: "A room charge awaits your confirmation.", read: false },
    ],
  };

  return {
    version: DEMO_VERSION,
    staff,
    guests,
    services,
    transactions: transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: keptPayments.sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    historical,
    priceRequests,
    limitChanges,
    audit,
    settings,
    notifications,
    sessions: {},
    backups: [
      { id: "b-3", createdAt: iso(1 * DAY), createdBy: "System", sizeKb: 842 },
      { id: "b-2", createdAt: iso(2 * DAY), createdBy: "System", sizeKb: 836 },
      { id: "b-1", createdAt: iso(9 * DAY), createdBy: "Selam Tesfaye", sizeKb: 801 },
    ],
    counters: { tx: txCounter, receipt: receiptCounter, id: 1000 },
  };
}
