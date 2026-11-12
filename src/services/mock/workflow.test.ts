import { beforeEach, describe, expect, it } from "vitest";
import type { AuthSession, CreditTransaction, GuestAccount, Payment } from "@/types";
import { writeSession } from "../session";
import { setMemoryState } from "./db";
import { demoRequest } from "./handlers";
import { buildSeed } from "./seed";

async function loginAs(username: string, password: string) {
  writeSession(null);
  const s = await demoRequest<AuthSession>("POST", "/auth/login", { username, password });
  writeSession(s);
  return s;
}
const account = async () => {
  await loginAs("finance", "finance123");
  const d = await demoRequest<{ account: GuestAccount }>("GET", "/guests/g-01");
  return d.account;
};

describe("credit transaction workflow (SRS 2.1, 2.3)", () => {
  beforeEach(() => setMemoryState(buildSeed()));

  it("debt only increases after Finance approval", async () => {
    const before = await account();
    await loginAs("cashier", "cashier123");
    const tx = await demoRequest<CreditTransaction>("POST", "/transactions", {
      guestId: "g-01",
      items: [{ serviceId: "s-02", quantity: 2 }],
    });
    expect(tx.status).toBe("pending_guest");
    expect(tx.total).toBe(1_700);

    await loginAs("abebe", "guest123");
    const confirmed = await demoRequest<CreditTransaction>("POST", `/transactions/${tx.id}/confirm`);
    expect(confirmed.status).toBe("pending_finance");
    expect((await account()).outstandingDebt).toBe(before.outstandingDebt);

    await demoRequest("POST", `/transactions/${tx.id}/approve`);
    expect((await account()).outstandingDebt).toBe(before.outstandingDebt + 1_700);
  });

  it("a dispute needs a written reason and returns the transaction to the cashier", async () => {
    await loginAs("cashier", "cashier123");
    const tx = await demoRequest<CreditTransaction>("POST", "/transactions", { guestId: "g-01", items: [{ serviceId: "s-07", quantity: 1 }] });
    await loginAs("abebe", "guest123");
    await expect(demoRequest("POST", `/transactions/${tx.id}/dispute`, { reason: "" })).rejects.toThrow(/reason/);
    const d = await demoRequest<CreditTransaction>("POST", `/transactions/${tx.id}/dispute`, { reason: "I did not order this." });
    expect(d.status).toBe("disputed");
    await expect(demoRequest("POST", `/transactions/${tx.id}/confirm`)).rejects.toThrow();
  });

  it("only the Finance Manager can approve transactions", async () => {
    await loginAs("cashier", "cashier123");
    await expect(demoRequest("POST", "/transactions/t-1046/approve")).rejects.toThrow(/permission/);
    await loginAs("admin", "admin123");
    await expect(demoRequest("POST", "/transactions/t-1046/approve")).rejects.toThrow(/permission/);
  });

  it("transactions over available credit need an exceptional approval with a reason", async () => {
    await loginAs("cashier", "cashier123");
    const tx = await demoRequest<CreditTransaction>("POST", "/transactions", { guestId: "g-01", items: [{ serviceId: "s-18", quantity: 20 }] });
    expect(tx.exceedsLimit).toBe(true);
    await loginAs("abebe", "guest123");
    const c = await demoRequest<CreditTransaction>("POST", `/transactions/${tx.id}/confirm`);
    expect(c.status).toBe("pending_exception");
    await loginAs("finance", "finance123");
    await expect(demoRequest("POST", `/transactions/${tx.id}/approve`, {})).rejects.toThrow(/reason/);
    const a = await demoRequest<CreditTransaction>("POST", `/transactions/${tx.id}/approve`, { reason: "Long-standing guest, CFO approved." });
    expect(a.exceptionApproval?.approvedBy).toBe("Meron Alemu");
  });

  it("partial payments reduce outstanding debt by the paid amount", async () => {
    const before = await account();
    const p = await demoRequest<Payment>("POST", "/payments", { guestId: "g-01", amount: 8_000, method: "cash", verified: true });
    expect(p.balanceAfter).toBe(before.outstandingDebt - 8_000);
    expect((await account()).outstandingDebt).toBe(before.outstandingDebt - 8_000);
  });

  it("special prices block submission to the guest until Finance approves", async () => {
    await loginAs("cashier", "cashier123");
    const tx = await demoRequest<CreditTransaction>("POST", "/transactions", {
      guestId: "g-01",
      items: [{ serviceId: "s-13", quantity: 1, requestedPrice: 4_000, priceReason: "Weekend promotion" }],
    });
    expect(tx.status).toBe("pending_price_approval");
  });
});
