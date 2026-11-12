import { describe, expect, it } from "vitest";
import { availableCredit, excessOverAvailable, outstandingDebt, statusAfterGuestConfirm } from "./credit";

describe("credit rules (SRS 2.2)", () => {
  it("available credit = limit − outstanding − pending reservations (50,000 − 30,000 − 5,000 = 15,000)", () => {
    expect(availableCredit(50_000, 30_000, 5_000)).toBe(15_000);
  });

  it("a 20,000 ETB transaction exceeds 15,000 available credit by 5,000", () => {
    expect(excessOverAvailable(20_000, 15_000)).toBe(5_000);
  });

  it("available credit is zero when debt already exceeds the limit", () => {
    expect(availableCredit(50_000, 62_000, 0)).toBe(0);
  });

  it("only approved transactions and verified payments change outstanding debt", () => {
    const debt = outstandingDebt(
      [
        { status: "approved", total: 20_000 },
        { status: "pending_finance", total: 9_000 },
        { status: "rejected", total: 4_000 },
      ],
      [
        { verified: true, amount: 8_000 },
        { verified: false, amount: 1_000 },
      ],
      [],
    );
    // SRS 6.3: 20,000 debt with an 8,000 partial payment leaves 12,000.
    expect(debt).toBe(12_000);
  });

  it("approved historical debt counts as opening balance; unverified does not", () => {
    expect(
      outstandingDebt([], [], [
        { status: "approved", amount: 100_000 },
        { status: "pending_verification", amount: 50_000 },
      ]),
    ).toBe(100_000);
  });

  it("over-limit transactions go to exceptional approval after guest confirmation", () => {
    expect(statusAfterGuestConfirm(true)).toBe("pending_exception");
    expect(statusAfterGuestConfirm(false)).toBe("pending_finance");
  });
});
