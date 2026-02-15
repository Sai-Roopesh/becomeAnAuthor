import type { WorldEventTemporal } from "@/domain/entities/types";

export const MIN_WORLD_YEAR = -9999;
export const MAX_WORLD_YEAR = 9999;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

export function createDefaultWorldEventTemporal(): WorldEventTemporal {
  return {
    precision: "year",
    year: 1,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
  };
}

export function normalizeWorldEventTemporal(
  value: Partial<WorldEventTemporal>,
): WorldEventTemporal {
  const year = clamp(
    Number.isFinite(value.year) ? Number(value.year) : 1,
    MIN_WORLD_YEAR,
    MAX_WORLD_YEAR,
  );
  const month = clamp(
    Number.isFinite(value.month) ? Number(value.month) : 1,
    1,
    12,
  );
  const day = clamp(
    Number.isFinite(value.day) ? Number(value.day) : 1,
    1,
    daysInMonth(year, month),
  );
  const hour = clamp(
    Number.isFinite(value.hour) ? Number(value.hour) : 0,
    0,
    23,
  );
  const minute = clamp(
    Number.isFinite(value.minute) ? Number(value.minute) : 0,
    0,
    59,
  );

  const precision =
    value.precision === "year" ||
    value.precision === "date" ||
    value.precision === "date-time"
      ? value.precision
      : "year";

  return {
    precision,
    year,
    month,
    day,
    hour,
    minute,
  };
}

export function formatWorldEventTemporal(temporal: WorldEventTemporal): string {
  if (temporal.precision === "year") {
    return `Year ${temporal.year}`;
  }

  const monthLabel = MONTH_NAMES[temporal.month - 1] ?? `M${temporal.month}`;
  const dateLabel = `${monthLabel} ${temporal.day}, Year ${temporal.year}`;

  if (temporal.precision === "date") {
    return dateLabel;
  }

  const hour = temporal.hour.toString().padStart(2, "0");
  const minute = temporal.minute.toString().padStart(2, "0");
  return `${dateLabel} at ${hour}:${minute}`;
}

export function worldEventTemporalSortValue(temporal: WorldEventTemporal): number {
  const normalized = normalizeWorldEventTemporal(temporal);
  const month = normalized.precision === "year" ? 1 : normalized.month;
  const day = normalized.precision === "year" ? 1 : normalized.day;
  const hour = normalized.precision === "date-time" ? normalized.hour : 0;
  const minute = normalized.precision === "date-time" ? normalized.minute : 0;

  return (
    normalized.year * 100_000_000 +
    month * 1_000_000 +
    day * 10_000 +
    hour * 100 +
    minute
  );
}
