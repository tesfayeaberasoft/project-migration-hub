// Shared domain types for the Haroni Hotel DCMS frontend.
// These mirror the JSON shapes the PHP backend returns (see src/services/API_CONTRACT.md).

export type Role = "admin" | "cashier" | "finance" | "guest";
export type AccountStatus = "active" | "inactive" | "suspended";

export interface AuthUser {
  id: string;
  role: Role;
  fullName: string;
  username: string;
  phone: string;
  status: AccountStatus;
  /** Set when role === "guest". */
  guestId?: string | undefined;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface StaffUser {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  role: Exclude<Role, "guest">;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt?: string | undefined;
}

export interface Guest {
  id: string;
  fullName: string;
  phone: string;
  username: string;
  status: AccountStatus;
  creditLimit: number;
  createdAt: string;
}

/** Guest plus the balances the backend computes for it. */
export interface GuestAccount extends Guest {
  historicalDebt: number;
  approvedCredit: number;
  totalPayments: number;
  outstandingDebt: number;
  pendingReservations: number;
  availableCredit: number;
  exceedsLimit: boolean;
}

export type ServiceCategory = "food" | "drinks" | "accommodation" | "other";

export interface HotelService {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  available: boolean;
  /** A catalog price proposed by the Administrator that awaits Finance approval. */
  proposedPrice?: number | undefined;
  priceHistory: { price: number; effectiveFrom: string; approvedBy: string }[];
}

export type TransactionStatus =
  | "pending_price_approval"
  | "pending_guest"
  | "disputed"
  | "pending_finance"
  | "pending_exception"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export interface TransactionItem {
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  quantity: number;
  unitPrice: number;
  /** Catalog price at the time of recording; differs from unitPrice only with an approved price request. */
  catalogPrice: number;
  priceRequest?: { requestedPrice: number; reason: string; status: "pending" | "approved" | "rejected" } | undefined;
  total: number;
}

export type ConfirmationMethod = "portal" | "pin" | "otp";

export interface TransactionEvent {
  at: string;
  by: string;
  action: string;
  note?: string | undefined;
}

export interface CreditTransaction {
  id: string;
  code: string;
  guestId: string;
  guestName: string;
  items: TransactionItem[];
  total: number;
  consumptionDate: string;
  createdAt: string;
  createdBy: string;
  status: TransactionStatus;
  confirmationDeadline?: string | undefined;
  exceedsLimit: boolean;
  /** How far over the available credit the transaction was at submission. */
  excessAmount: number;
  revision: number;
  disputeReason?: string | undefined;
  rejectionReason?: string | undefined;
  confirmation?: { method: ConfirmationMethod; at: string; assistedBy?: string | undefined } | undefined;
  exceptionApproval?: { approvedBy: string; reason: string; at: string } | undefined;
  financeDecision?: { by: string; at: string } | undefined;
  history: TransactionEvent[];
}

export type PaymentMethod = "cash" | "bank_transfer";

export interface Payment {
  id: string;
  receiptNumber: string;
  guestId: string;
  guestName: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | undefined;
  bankName?: string | undefined;
  paidAt: string;
  recordedBy: string;
  verified: boolean;
  balanceBefore: number;
  balanceAfter: number;
  note?: string | undefined;
}

export type HistoricalStatus = "pending_verification" | "approved" | "rejected";

export interface HistoricalDebt {
  id: string;
  guestId: string;
  guestName: string;
  amount: number;
  sourceReference: string;
  evidenceNote?: string | undefined;
  originalDate: string;
  status: HistoricalStatus;
  enteredBy: string;
  enteredAt: string;
  verifiedBy?: string | undefined;
  verifiedAt?: string | undefined;
}

export interface PriceRequest {
  id: string;
  kind: "transaction" | "catalog";
  serviceId: string;
  serviceName: string;
  currentPrice: number;
  requestedPrice: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  transactionId?: string | undefined;
  transactionCode?: string | undefined;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string | undefined;
  decidedAt?: string | undefined;
}

export interface CreditLimitChange {
  id: string;
  guestId: string;
  guestName: string;
  previousLimit: number;
  newLimit: number;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  role: Role | "system";
  category: "auth" | "transaction" | "payment" | "user" | "guest" | "settings" | "catalog" | "credit" | "historical" | "backup";
  action: string;
  details?: string | undefined;
}

export interface SystemSettings {
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelTin: string;
  currency: string;
  confirmationDeadlineHours: number;
  reminderBeforeHours: number;
  historicalDebtTarget: number;
  receiptFooter: string;
  smsRemindersEnabled: boolean;
}

export interface Notification {
  id: string;
  at: string;
  title: string;
  body: string;
  read: boolean;
}

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type ReportType =
  | "summary"
  | "guest_debt"
  | "payments"
  | "outstanding"
  | "credit_transactions"
  | "historical";

export interface ReportResult {
  title: string;
  period: ReportPeriod;
  from: string;
  to: string;
  columns: { key: string; label: string; money?: boolean }[];
  rows: Record<string, string | number>[];
  totals: { label: string; value: number }[];
  series: { label: string; credit: number; payments: number }[];
}

export interface ApiErrorShape {
  message: string;
  status: number;
  fieldErrors?: Record<string, string> | undefined;
}
