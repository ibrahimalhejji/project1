import type { Locale } from "@/i18n/config";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDate(iso: string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(date);
}

export function formatDateRange(start: string, end: string, locale: Locale): string {
  if (!start) return "";
  if (!end || end === start) return formatDate(start, locale);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (sameMonth) {
    const dayStart = formatDate(start, locale, { month: undefined, year: undefined, day: "numeric" });
    return `${dayStart} - ${formatDate(end, locale)}`;
  }
  return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
}

export function formatDateTime(iso: string, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatMoney(amount: number, currency: string, locale: Locale): string {
  if (!amount) return locale === "ar" ? "مجاني" : "Free";
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return days;
  while (cursor <= last && days.length < 30) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function localized<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string {
  const key = `${field}${locale === "ar" ? "Ar" : "En"}`;
  const fallback = `${field}${locale === "ar" ? "En" : "Ar"}`;
  const value = (row[key] as string | undefined) || (row[fallback] as string | undefined) || "";
  return value;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
