/** Exact boundary normalization only; balances and financial calculations belong to Django. */
export function normalizeOpeningBalance(input: string): string {
  const match = input.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match || match[1].length > 30)
    throw new Error("Enter a non-negative amount with at most two decimals.");
  const rupees = match[1].replace(/^0+(?=\d)/, "");
  const cents = (match[2] || "").padEnd(2, "0");
  if (BigInt(rupees) * BigInt(100) + BigInt(cents) > BigInt("9000000000000000")) {
    throw new Error("Opening balance exceeds the supported limit.");
  }
  return `${rupees}.${cents}`;
}

export function todayInKolkata(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
