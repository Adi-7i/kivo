import { format } from "date-fns";

/**
 * Faithfully parses date-only strings (YYYY-MM-DD) into a local Date
 * object at local midnight, preventing timezone day-shift anomalies.
 */
export function parseDateOnly(dateStr: string): Date {
  if (typeof dateStr !== "string") {
    throw new TypeError("Date input must be a string");
  }

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD, received "${dateStr}"`);
  }

  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const day = parseInt(match[3]!, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid calendar month or day: "${dateStr}"`);
  }

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  // Validate that the date didn't roll over (e.g. Feb 31 -> March 3)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid calendar date: "${dateStr}"`);
  }

  return date;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) or Date object into human-readable format.
 * Defaults to "dd MMM yyyy" (e.g., "17 Oct 2026").
 */
export function formatDateDisplay(
  dateInput: string | Date,
  formatStr: string = "dd MMM yyyy"
): string {
  let date: Date;

  if (typeof dateInput === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      date = parseDateOnly(dateInput);
    } else {
      date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: "${dateInput}"`);
      }
    }
  } else if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error("Invalid Date object");
    }
    date = dateInput;
  } else {
    throw new TypeError("Date input must be a string or Date instance");
  }

  return format(date, formatStr);
}

/**
 * Formats a date into "Month Year" (e.g., "October 2026").
 */
export function formatMonthYear(dateInput: string | Date): string {
  return formatDateDisplay(dateInput, "MMMM yyyy");
}

/**
 * Formats an ISO datetime string into a readable date and time display.
 */
export function formatDateTimeDisplay(isoStr: string): string {
  if (typeof isoStr !== "string") {
    throw new TypeError("Datetime input must be a string");
  }

  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime string: "${isoStr}"`);
  }

  return format(date, "dd MMM yyyy, HH:mm");
}
