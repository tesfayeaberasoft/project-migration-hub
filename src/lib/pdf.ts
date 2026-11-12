// PDF documents: payment receipts, guest debt statements and financial reports.
// jsPDF is browser-only, so it is loaded on demand when the user clicks a download button.
import emblemUrl from "@/assets/haroni-emblem.png";
import type { Statement } from "@/services/finance.service";
import type { Payment, ReportResult, SystemSettings } from "@/types";

type RGB = [number, number, number];
const GOLD: RGB = [184, 146, 62];
const INK: RGB = [28, 25, 20];
const MUTED: RGB = [110, 104, 92];

const fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const m = (n: number, cur = "ETB") => `${fmt.format(n ?? 0)} ${cur}`;
const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const dt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

let emblemData: string | null = null;
async function emblem() {
  if (emblemData) return emblemData;
  try {
    const blob = await (await fetch(emblemUrl)).blob();
    emblemData = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch {
    emblemData = "";
  }
  return emblemData;
}

async function load() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { jsPDF, autoTable };
}

type Doc = InstanceType<Awaited<ReturnType<typeof load>>["jsPDF"]>;

async function header(doc: Doc, settings: SystemSettings, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...INK);
  doc.rect(0, 0, w, 34, "F");
  const img = await emblem();
  if (img) doc.addImage(img, "PNG", 12, 6, 22, 22);
  doc.setTextColor(...GOLD);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text(settings.hotelName.toUpperCase(), 40, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 210, 190);
  doc.text(`${settings.hotelAddress}  |  ${settings.hotelPhone}  |  ${settings.hotelEmail}`, 40, 23);
  doc.text(`TIN ${settings.hotelTin}`, 40, 28);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 14, 48);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, 14, 54);
  }
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(14, 58, w - 14, 58);
}

function footer(doc: Doc, text: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(14, h - 16, w - 14, h - 16);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(text, 14, h - 10);
    doc.text(`Generated ${dt(new Date().toISOString())}  |  Page ${i} of ${pages}`, w - 14, h - 10, { align: "right" });
  }
}

const tableTheme = {
  headStyles: { fillColor: INK, textColor: GOLD, fontStyle: "bold" as const, fontSize: 8.5 },
  bodyStyles: { fontSize: 8.5, textColor: INK },
  alternateRowStyles: { fillColor: [248, 245, 238] as RGB },
  styles: { cellPadding: 2.4, lineColor: [230, 222, 205] as RGB, lineWidth: 0.1 },
  margin: { left: 14, right: 14 },
};

export async function downloadReceiptPdf(p: Payment, opts: { guestPhone?: string | undefined; settings: SystemSettings }) {
  const { jsPDF, autoTable } = await load();
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const cur = opts.settings.currency;
  await header(doc, opts.settings, "PAYMENT RECEIPT", `Receipt No. ${p.receiptNumber}`);
  autoTable(doc, {
    ...tableTheme,
    startY: 64,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2.2 },
    columnStyles: { 0: { textColor: MUTED, cellWidth: 52 }, 1: { fontStyle: "bold", textColor: INK } },
    body: [
      ["Receipt number", p.receiptNumber],
      ["Guest full name", p.guestName],
      ["Guest phone number", opts.guestPhone || "-"],
      ["Payment date", d(p.paidAt)],
      ["Payment method", p.method === "cash" ? "Cash" : "Bank transfer"],
      ...(p.method === "bank_transfer" ? [["Bank", p.bankName || "-"], ["Bank reference number", p.reference || "-"]] : []),
      ["Previous outstanding debt", m(p.balanceBefore, cur)],
      ["Payment amount", m(p.amount, cur)],
      ["Remaining outstanding debt", m(p.balanceAfter, cur)],
      ["Recorded by (Finance Manager)", p.recordedBy],
      ["Payment status", p.verified ? "Verified - received by the hotel" : "Awaiting verification"],
    ],
  });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(248, 242, 226);
  doc.roundedRect(14, y, w - 28, 16, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("AMOUNT PAID", 19, y + 6.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(m(p.amount, cur), w - 19, y + 10.5, { align: "right" });
  footer(doc, opts.settings.receiptFooter);
  doc.save(`${p.receiptNumber}.pdf`);
}

export async function downloadStatementPdf(s: Statement, settings: SystemSettings) {
  const { jsPDF, autoTable } = await load();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cur = settings.currency;
  const a = s.account;
  await header(doc, settings, "GUEST DEBT STATEMENT", `${a.fullName}  |  ${a.phone}  |  As of ${dt(new Date().toISOString())}`);
  autoTable(doc, {
    ...tableTheme,
    startY: 64,
    head: [["Summary", "Amount"]],
    columnStyles: { 1: { halign: "right" } },
    body: [
      ["Credit limit", m(a.creditLimit, cur)],
      ["Historical debt (opening balance)", m(a.historicalDebt, cur)],
      ["Approved credit transactions", m(a.approvedCredit, cur)],
      ["Payments received", `- ${m(a.totalPayments, cur)}`],
      ["Outstanding debt", m(a.outstandingDebt, cur)],
      ["Pending reservations", m(a.pendingReservations, cur)],
      ["Available credit", m(a.availableCredit, cur)],
    ],
  });
  const next = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (s.historical.length) {
    autoTable(doc, {
      ...tableTheme,
      startY: next(),
      head: [["Historical debt", "Source reference", "Original date", "Amount"]],
      columnStyles: { 3: { halign: "right" } },
      body: s.historical.map((h) => ["Opening balance", h.sourceReference, d(h.originalDate), m(h.amount, cur)]),
    });
  }
  autoTable(doc, {
    ...tableTheme,
    startY: next(),
    head: [["Date", "Transaction", "Services", "Amount"]],
    columnStyles: { 3: { halign: "right" } },
    body: s.transactions.length
      ? s.transactions.map((t) => [d(t.consumptionDate), t.code, t.items.map((i) => `${i.serviceName} x${i.quantity}`).join(", "), m(t.total, cur)])
      : [["", "No approved credit transactions", "", ""]],
  });
  autoTable(doc, {
    ...tableTheme,
    startY: next(),
    head: [["Date", "Receipt", "Method", "Amount", "Balance after"]],
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    body: s.payments.length
      ? s.payments.map((p) => [d(p.paidAt), p.receiptNumber, p.method === "cash" ? "Cash" : "Bank transfer", m(p.amount, cur), m(p.balanceAfter, cur)])
      : [["", "No payments recorded", "", "", ""]],
  });
  footer(doc, settings.receiptFooter);
  doc.save(`Statement-${a.username}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function downloadReportPdf(r: ReportResult, settings: SystemSettings) {
  const { jsPDF, autoTable } = await load();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: r.columns.length > 5 ? "landscape" : "portrait" });
  const cur = settings.currency;
  await header(doc, settings, r.title.toUpperCase(), `Period: ${d(r.from)} - ${d(r.to)}`);
  autoTable(doc, {
    ...tableTheme,
    startY: 64,
    head: [["Total", "Value"]],
    columnStyles: { 1: { halign: "right" } },
    body: r.totals.map((t) => [t.label, /count|guests/i.test(t.label) ? String(t.value) : m(t.value, cur)]),
  });
  autoTable(doc, {
    ...tableTheme,
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
    head: [r.columns.map((c) => c.label)],
    columnStyles: Object.fromEntries(r.columns.map((c, i) => [i, c.money ? { halign: "right" as const } : {}])),
    body: r.rows.length
      ? r.rows.map((row) => r.columns.map((c) => (c.money ? m(Number(row[c.key] ?? 0), cur) : String(row[c.key] ?? ""))))
      : [[{ content: "No records for this period", colSpan: r.columns.length }]],
  });
  footer(doc, `${settings.hotelName} - Digital Credit Management System`);
  doc.save(`${r.title.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
