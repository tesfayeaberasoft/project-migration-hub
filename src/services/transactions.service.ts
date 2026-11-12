import type { CreditTransaction, GuestAccount, TransactionStatus } from "@/types";
import { api } from "./http";

export interface TransactionLineInput {
  serviceId: string;
  quantity: number;
  /** Only when requesting a special price; requires Finance approval. */
  requestedPrice?: number | undefined;
  priceReason?: string | undefined;
}

export interface TransactionInput {
  guestId: string;
  consumptionDate: string;
  items: TransactionLineInput[];
  note?: string | undefined;
}

export interface TransactionFilter {
  status?: TransactionStatus | TransactionStatus[] | undefined;
  guestId?: string | undefined;
  search?: string | undefined;
}

export const transactionsService = {
  list: (f: TransactionFilter = {}) =>
    api.get<CreditTransaction[]>("/transactions", {
      status: Array.isArray(f.status) ? f.status.join(",") : f.status,
      guestId: f.guestId,
      search: f.search,
    }),
  get: (id: string) => api.get<{ transaction: CreditTransaction; account?: GuestAccount }>(`/transactions/${id}`),
  create: (input: TransactionInput) => api.post<CreditTransaction>("/transactions", input),
  correct: (id: string, input: Omit<TransactionInput, "guestId">) => api.put<CreditTransaction>(`/transactions/${id}`, input),
  confirm: (id: string) => api.post<CreditTransaction>(`/transactions/${id}/confirm`),
  dispute: (id: string, reason: string) => api.post<CreditTransaction>(`/transactions/${id}/dispute`, { reason }),
  sendOtp: (id: string) => api.post<{ sentTo: string; demoCode?: string }>(`/transactions/${id}/send-otp`),
  confirmInHotel: (id: string, method: "pin" | "otp", code: string) =>
    api.post<CreditTransaction>(`/transactions/${id}/confirm-in-hotel`, { method, code }),
  cancel: (id: string, reason: string) => api.post<CreditTransaction>(`/transactions/${id}/cancel`, { reason }),
  approve: (id: string, reason?: string) => api.post<CreditTransaction>(`/transactions/${id}/approve`, { reason }),
  reject: (id: string, reason: string) => api.post<CreditTransaction>(`/transactions/${id}/reject`, { reason }),
};
