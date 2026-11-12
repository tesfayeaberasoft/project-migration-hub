import type { AuditLog, SystemSettings } from "@/types";
import { api } from "./http";

export interface BackupInfo {
  id: string;
  createdAt: string;
  createdBy: string;
  sizeKb: number;
}

export const systemService = {
  settings: () => api.get<SystemSettings>("/settings"),
  updateSettings: (s: Partial<SystemSettings>) => api.put<SystemSettings>("/settings", s),
  auditLogs: (category?: string, search?: string) => api.get<AuditLog[]>("/audit-logs", { category, search }),
  backups: () => api.get<BackupInfo[]>("/backups"),
  createBackup: () => api.post<{ backup: BackupInfo; snapshot: unknown }>("/backups"),
  restore: (snapshot: unknown) => api.post<{ ok: true }>("/backups/restore", { snapshot }),
};
