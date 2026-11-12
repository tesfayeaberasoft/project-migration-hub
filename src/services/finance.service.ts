import type {
  CreditTransaction,
  GuestAccount,
  HistoricalDebt,
  Notification,
  Payment,
  PaymentMethod,
  ReportPeriod,
  ReportResult,
  ReportType,
} from "@/types";
import { api } from "./http";

export interface PaymentInput {
  guestId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | undefined;
  bankName?: string | undefined;
  paidAt: string;
  verified: boolean;
  note?: string | undefined;
}

export interface HistoricalInput {
  guestId: string;
  amount: number;
  sourceReference: string;
  evidenceNote?: string | undefined;
  originalDate: string;
}

export interface Reconciliation {
  target: number;
  approved: number;
  pending: number;
  rejected: number;
  imported: number;
  difference: number;
  records: number;
}

export interface Statement {
  account: GuestAccount;
  historical: HistoricalDebt[];
  transactions: CreditTransaction[];
  payments: Payment[];
}

export const paymentsService = {
  list: (guestId?: string) => api.get<Payment[]>("/payments", { guestId }),
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  record: (input: PaymentInput) => api.post<Payment>("/payments", input),
  verify: (id: string) => api.post<Payment>(`/payments/${id}/verify`),
};

export const historicalService = {
  list: () => api.get<HistoricalDebt[]>("/historical-debts"),
  reconciliation: () => api.get<Reconciliation>("/historical-debts/reconciliation"),
  create: (input: HistoricalInput) => api.post<HistoricalDebt>("/historical-debts", input),
  importRows: (rows: { username: string; amount: number; sourceReference: string; originalDate?: string }[]) =>
    api.post<{ created: number; errors: string[] }>("/historical-debts/import", { rows }),
  approve: (id: string) => api.post<HistoricalDebt>(`/historical-debts/${id}/approve`),
  reject: (id: string) => api.post<HistoricalDebt>(`/historical-debts/${id}/reject`),
};

export const reportsService = {
  run: (type: ReportType, period: ReportPeriod) => api.get<ReportResult>("/reports", { type, period }),
};

export const guestSelfService = {
  account: () => api.get<GuestAccount>("/me/account"),
  statement: () => api.get<Statement>("/me/statement"),
  notifications: () => api.get<Notification[]>("/me/notifications"),
  markNotificationsRead: () => api.post<{ ok: true }>("/me/notifications/read"),
};
