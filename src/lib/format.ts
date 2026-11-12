import { format, formatDistanceToNowStrict } from "date-fns";

const etb = new Intl.NumberFormat("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const etbCompact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 });

export function money(n: number, currency = "ETB") {
  return `${etb.format(n ?? 0)} ${currency}`;
}

export function moneyCompact(n: number, currency = "ETB") {
  return `${etbCompact.format(n ?? 0)} ${currency}`;
}

export function date(d?: string) {
  return d ? format(new Date(d), "dd MMM yyyy") : "—";
}

export function dateTime(d?: string) {
  return d ? format(new Date(d), "dd MMM yyyy, HH:mm") : "—";
}

export function fromNow(d?: string) {
  return d ? formatDistanceToNowStrict(new Date(d), { addSuffix: true }) : "—";
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
