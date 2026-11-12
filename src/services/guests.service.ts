import type {
  AccountStatus,
  CreditLimitChange,
  CreditTransaction,
  Guest,
  GuestAccount,
  HistoricalDebt,
  Payment,
} from "@/types";
import { api } from "./http";

export interface GuestInput {
  fullName: string;
  phone: string;
  username: string;
  password: string;
  pin: string;
}

export interface GuestDetail {
  account: GuestAccount;
  transactions: CreditTransaction[];
  payments?: Payment[] | undefined;
  historical?: HistoricalDebt[] | undefined;
  limitChanges?: CreditLimitChange[] | undefined;
}

export const guestsService = {
  /** Finance and Cashier receive balances; Administrators receive identity fields only. */
  search: (search?: string, status?: AccountStatus) => api.get<GuestAccount[]>("/guests", { search, status }),
  listBasic: () => api.get<Guest[]>("/guests"),
  detail: (id: string) => api.get<GuestDetail>(`/guests/${id}`),
  create: (input: GuestInput) => api.post<Guest>("/guests", input),
  update: (id: string, input: Partial<Omit<GuestInput, "username" | "password">>) => api.put<Guest>(`/guests/${id}`, input),
  setStatus: (id: string, status: AccountStatus) => api.post<Guest>(`/guests/${id}/status`, { status }),
  resetPassword: (id: string, newPassword: string) => api.post<{ ok: true }>(`/users/${id}/reset-password`, { newPassword }),
  setCreditLimit: (id: string, creditLimit: number, reason: string) =>
    api.post<GuestAccount>(`/guests/${id}/credit-limit`, { creditLimit, reason }),
  limitHistory: () => api.get<CreditLimitChange[]>("/credit-limits/history"),
};
