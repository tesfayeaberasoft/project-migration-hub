// Pure business rules from the SRS (sections 2.2, 6, and business rules BR-07..BR-18).
// Shared by the UI and the offline demo backend so both always agree.

import type { CreditTransaction, HistoricalDebt, Payment, TransactionStatus } from "@/types";

/** Statuses that hold a credit reservation (awaiting confirmation or approval). */
export const RESERVING_STATUSES: TransactionStatus[] = [
  "pending_price_approval",
  "pending_guest",
  "disputed",
  "pending_finance",
  "pending_exception",
];

/**
 * Available Credit = Credit Limit − Outstanding Debt − Pending Credit Reservations.
 * Never negative: if debt already exceeds the limit, available credit is zero.
 */
export function availableCredit(creditLimit: number, outstandingDebt: number, reservations: number) {
  return Math.max(0, roundMoney(creditLimit - outstandingDebt - reservations));
}

/** Amount by which a new transaction exceeds the available credit (0 if within limit). */
export function excessOverAvailable(amount: number, available: number) {
  return Math.max(0, roundMoney(amount - available));
}

export function sumReservations(transactions: CreditTransaction[], excludeId?: string) {
  return roundMoney(
    transactions
      .filter((t) => t.id !== excludeId && RESERVING_STATUSES.includes(t.status))
      .reduce((s, t) => s + t.total, 0),
  );
}

/**
 * Outstanding debt = approved historical opening balances + approved credit transactions
 * − verified payments. Pending, disputed, rejected, expired and cancelled transactions never count.
 */
export function outstandingDebt(
  transactions: Pick<CreditTransaction, "status" | "total">[],
  payments: Pick<Payment, "verified" | "amount">[],
  historical: Pick<HistoricalDebt, "status" | "amount">[],
) {
  const hist = historical.filter((h) => h.status === "approved").reduce((s, h) => s + h.amount, 0);
  const approved = transactions.filter((t) => t.status === "approved").reduce((s, t) => s + t.total, 0);
  const paid = payments.filter((p) => p.verified).reduce((s, p) => s + p.amount, 0);
  return roundMoney(hist + approved - paid);
}

export function lineTotal(quantity: number, unitPrice: number) {
  return roundMoney(quantity * unitPrice);
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/** Status a transaction moves to after the guest confirms it. */
export function statusAfterGuestConfirm(exceedsLimit: boolean): TransactionStatus {
  return exceedsLimit ? "pending_exception" : "pending_finance";
}
