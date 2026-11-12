// Minimal CSV reader for historical debt imports (quoted fields, commas, CRLF).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export interface HistoricalImportRow {
  username: string;
  amount: number;
  sourceReference: string;
  originalDate?: string;
}

/** Reads `username,amount,sourceReference,originalDate` rows. A header row is detected and skipped. Amounts may contain thousands separators. */
export function parseHistoricalCsv(text: string): HistoricalImportRow[] {
  const rows = parseCsv(text);
  if (rows[0] && rows[0][0]?.trim().toLowerCase() === "username") rows.shift();
  return rows.map((r) => {
    const date = (r[3] ?? "").trim();
    return {
      username: (r[0] ?? "").trim().toLowerCase(),
      amount: Number((r[1] ?? "").replace(/[,\s]/g, "")),
      sourceReference: (r[2] ?? "").trim(),
      ...(date ? { originalDate: date } : {}),
    };
  });
}
