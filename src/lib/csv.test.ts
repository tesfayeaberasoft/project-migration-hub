import { describe, expect, it } from "vitest";
import { parseHistoricalCsv } from "./csv";

describe("parseHistoricalCsv", () => {
  it("skips the header row and reads amounts with thousands separators", () => {
    const rows = parseHistoricalCsv('username,amount,sourceReference,originalDate\nabebe,"12,500.50",Ledger A p.4,2024-03-01\r\n');
    expect(rows).toEqual([{ username: "abebe", amount: 12500.5, sourceReference: "Ledger A p.4", originalDate: "2024-03-01" }]);
  });

  it("omits the date when the column is empty", () => {
    const rows = parseHistoricalCsv("Tigist,3000,Slip 77,\n");
    expect(rows[0]).toEqual({ username: "tigist", amount: 3000, sourceReference: "Slip 77" });
  });
});
