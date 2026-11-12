import type { AuthSession } from "@/types";
import { api } from "./http";

export const authService = {
  login: (username: string, password: string) => api.post<AuthSession>("/auth/login", { username, password }),
  logout: () => api.post<{ ok: true }>("/auth/logout"),
  forgotPassword: (username: string) => api.post<{ message: string }>("/auth/forgot-password", { username }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: true }>("/auth/change-password", { currentPassword, newPassword }),
};
