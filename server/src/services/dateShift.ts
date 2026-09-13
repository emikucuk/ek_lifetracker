import type { RecurRule } from "@prisma/client";

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function shiftDate(value: Date | null | undefined, days: number): Date | null {
  if (!value) return null;
  return addDays(value, days);
}

export function recurOffsetDays(rule: RecurRule): number {
  switch (rule) {
    case "DAILY":
      return 1;
    case "WEEKLY":
      return 7;
    case "MONTHLY":
      return 30;
    default:
      return 7;
  }
}

export function snoozeDays(amount: "1d" | "1w"): number {
  return amount === "1w" ? 7 : 1;
}
