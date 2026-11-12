// Query definitions shared by route loaders (ensureQueryData) and components (useSuspenseQuery).
import { queryOptions } from "@tanstack/react-query";
import { catalogService } from "@/services/catalog.service";
import { dashboardService } from "@/services/dashboard.service";
import { guestSelfService, historicalService, paymentsService, reportsService } from "@/services/finance.service";
import { guestsService } from "@/services/guests.service";
import { systemService } from "@/services/system.service";
import { transactionsService, type TransactionFilter } from "@/services/transactions.service";
import { usersService } from "@/services/users.service";
import type { ReportPeriod, ReportType } from "@/types";

export const q = {
  adminDashboard: () => queryOptions({ queryKey: ["dashboard", "admin"], queryFn: dashboardService.admin }),
  cashierDashboard: () => queryOptions({ queryKey: ["dashboard", "cashier"], queryFn: dashboardService.cashier }),
  financeDashboard: () => queryOptions({ queryKey: ["dashboard", "finance"], queryFn: dashboardService.finance }),
  guestDashboard: () => queryOptions({ queryKey: ["dashboard", "guest"], queryFn: dashboardService.guest }),

  users: () => queryOptions({ queryKey: ["users"], queryFn: usersService.list }),
  guestsBasic: () => queryOptions({ queryKey: ["guests", "basic"], queryFn: guestsService.listBasic }),
  guestAccounts: (search = "") =>
    queryOptions({ queryKey: ["guests", "accounts", search], queryFn: () => guestsService.search(search || undefined) }),
  guestDetail: (id: string) => queryOptions({ queryKey: ["guests", "detail", id], queryFn: () => guestsService.detail(id) }),
  limitHistory: () => queryOptions({ queryKey: ["credit-limits", "history"], queryFn: guestsService.limitHistory }),

  services: () => queryOptions({ queryKey: ["services"], queryFn: catalogService.list }),
  priceRequests: () => queryOptions({ queryKey: ["price-requests"], queryFn: catalogService.priceRequests }),

  transactions: (f: TransactionFilter = {}) =>
    queryOptions({ queryKey: ["transactions", f], queryFn: () => transactionsService.list(f) }),
  transaction: (id: string) => queryOptions({ queryKey: ["transactions", "one", id], queryFn: () => transactionsService.get(id) }),

  payments: (guestId?: string) => queryOptions({ queryKey: ["payments", guestId ?? "all"], queryFn: () => paymentsService.list(guestId) }),
  historical: () => queryOptions({ queryKey: ["historical"], queryFn: historicalService.list }),
  reconciliation: () => queryOptions({ queryKey: ["historical", "reconciliation"], queryFn: historicalService.reconciliation }),
  report: (type: ReportType, period: ReportPeriod) =>
    queryOptions({ queryKey: ["reports", type, period], queryFn: () => reportsService.run(type, period) }),

  myAccount: () => queryOptions({ queryKey: ["me", "account"], queryFn: guestSelfService.account }),
  myStatement: () => queryOptions({ queryKey: ["me", "statement"], queryFn: guestSelfService.statement }),
  myNotifications: () => queryOptions({ queryKey: ["me", "notifications"], queryFn: guestSelfService.notifications }),

  settings: () => queryOptions({ queryKey: ["settings"], queryFn: systemService.settings }),
  auditLogs: (category = "", search = "") =>
    queryOptions({ queryKey: ["audit", category, search], queryFn: () => systemService.auditLogs(category || undefined, search || undefined) }),
  backups: () => queryOptions({ queryKey: ["backups"], queryFn: systemService.backups }),
};
