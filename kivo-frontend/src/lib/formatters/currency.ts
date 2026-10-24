export interface FormatInrOptions {
  showSymbol?: boolean;
  showSign?: boolean;
}

function formatIndianNumber(num: number): string {
  const str = num.toString();
  if (str.length <= 3) return str;
  const lastThree = str.slice(-3);
  const remaining = str.slice(0, -3);
  const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${formattedRemaining},${lastThree}`;
}

/**
 * Formats an integer amount in paise (1 INR = 100 paise) as an Indian Rupee string.
 * Strictly requires integer input — zero floating-point arithmetic allowed.
 */
export function formatInr(paise: number, options: FormatInrOptions = {}): string {
  if (typeof paise !== "number" || !Number.isSafeInteger(paise)) {
    throw new TypeError("Paise must be an integer");
  }

  const { showSymbol = true, showSign = false } = options;

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const formattedRupees = formatIndianNumber(rupees);
  const formattedPaise = remainderPaise.toString().padStart(2, "0");

  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (showSign && paise > 0) {
    sign = "+";
  }

  const symbol = showSymbol ? "₹" : "";

  return `${sign}${symbol}${formattedRupees}.${formattedPaise}`;
}

/**
 * Parses user decimal input (e.g., "1234.56", "₹50.00", "-100.5") into integer paise.
 * Rejects numbers with more than 2 decimal places to prevent precision corruption.
 */
export function parseDecimalStringToPaise(input: string): number {
  if (typeof input !== "string") {
    throw new TypeError("Input must be a string");
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Input string cannot be empty");
  }

  // Remove currency symbol and commas
  const cleaned = trimmed.replace(/₹/g, "").replace(/,/g, "").trim();
  if (!cleaned) {
    throw new Error("Invalid currency string");
  }

  // Strict regex for valid decimal amount: optional sign, digits, optional decimal with 1 or 2 digits
  const match = cleaned.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid decimal currency format: "${input}"`);
  }

  const sign = match[1] === "-" ? -1 : 1;
  const rupeesStr = match[2]!;
  const paiseStr = match[3] ?? "";

  if (paiseStr.length > 2) {
    throw new Error(`Exceeded maximum decimal precision of 2 digits: "${input}"`);
  }

  const rupees = parseInt(rupeesStr, 10);
  const paise = paiseStr ? parseInt(paiseStr.padEnd(2, "0"), 10) : 0;

  return sign * (rupees * 100 + paise);
}

/**
 * Converts integer paise to exact 2-decimal string format (e.g. 123456 -> "1234.56").
 */
export function paiseToDecimalString(paise: number): string {
  if (typeof paise !== "number" || !Number.isSafeInteger(paise)) {
    throw new TypeError("Paise must be an integer");
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;

  const sign = isNegative ? "-" : "";
  return `${sign}${rupees}.${remainder.toString().padStart(2, "0")}`;
}
