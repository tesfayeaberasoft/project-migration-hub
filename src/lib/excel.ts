// Excel export for financial reports (browser only, loaded on demand).
import type { ReportResult } from "@/types";

export async function downloadReportXlsx(r: ReportResult, hotelName: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const bold = { fontWeight: "bold" as const };
  const sheet = [
    [{ value: `${hotelName} - ${r.title}`, ...bold }],
    [{ value: `Period: ${r.from.slice(0, 10)} to ${r.to.slice(0, 10)}` }],
    [],
    ...r.totals.map((t) => [{ value: t.label, ...bold }, { value: t.value, type: Number, format: "#,##0.00" }]),
    [],
    r.columns.map((c) => ({ value: c.label, ...bold })),
    ...r.rows.map((row) =>
      r.columns.map((c) => {
        const v = row[c.key];
        return c.money || typeof v === "number"
          ? { value: Number(v ?? 0), type: Number, ...(c.money ? { format: "#,##0.00" } : {}) }
          : { value: String(v ?? "") };
      }),
    ),
  ];
  await writeXlsxFile(sheet, { columns: r.columns.map((c) => ({ width: c.money ? 18 : 24 })) }).toFile(
    `${r.title.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
