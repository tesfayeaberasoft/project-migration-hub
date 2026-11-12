import type { AuditLog, CreditTransaction, GuestAccount, Notification, Payment } from "@/types";
import { api } from "./http";

export interface AdminDashboard {
  totalGuests: number;
  activeGuests: number;
  totalUsers: number;
  cashiers: number;
  financeManagers: number;
  admins: number;
  totalTransactions: number;
  services: number;
  activity: { label: string; transactions: number; logins: number }[];
  recentAudit: AuditLog[];
}
export interface CashierDashboard {
  totalRecorded: number;
  recordedByMe: number;
  pendingGuest: number;
  disputed: number;
  awaitingFinance: number;
  approved: number;
  rejected: number;
  pendingPrice: number;
  recent: CreditTransaction[];
}
export interface FinanceDashboard {
  totalOutstanding: number;
  totalPayments: number;
  totalApprovedCredit: number;
  approvedCount: number;
  pendingApprovals: number;
  pendingExceptions: number;
  pendingPriceRequests: number;
  pendingHistorical: number;
  totalHistorical: number;
  historicalTarget: number;
  guestCount: number;
  exceeding: GuestAccount[];
  series: { label: string; credit: number; payments: number }[];
  recentPayments: Payment[];
}
export interface GuestDashboard {
  account: GuestAccount;
  pending: CreditTransaction[];
  activity: { at: string; title: string; amount: number; kind: "transaction" | "payment" }[];
  notifications: Notification[];
}

export const dashboardService = {
  admin: () => api.get<AdminDashboard>("/dashboard/admin"),
  cashier: () => api.get<CashierDashboard>("/dashboard/cashier"),
  finance: () => api.get<FinanceDashboard>("/dashboard/finance"),
  guest: () => api.get<GuestDashboard>("/dashboard/guest"),
};
