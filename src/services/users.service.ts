import type { AccountStatus, StaffUser } from "@/types";
import { api } from "./http";

export interface StaffInput {
  fullName: string;
  username: string;
  phone: string;
  role: StaffUser["role"];
  password?: string | undefined;
}

export const usersService = {
  list: () => api.get<StaffUser[]>("/users"),
  create: (input: StaffInput) => api.post<StaffUser>("/users", input),
  update: (id: string, input: Partial<StaffInput>) => api.put<StaffUser>(`/users/${id}`, input),
  setStatus: (id: string, status: AccountStatus) => api.post<StaffUser>(`/users/${id}/status`, { status }),
  resetPassword: (id: string, newPassword: string) => api.post<{ ok: true }>(`/users/${id}/reset-password`, { newPassword }),
};
