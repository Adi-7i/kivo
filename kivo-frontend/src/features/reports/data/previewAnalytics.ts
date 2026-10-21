import type {
  AnalyticsSummary,
  SpendingTrendPoint,
  CategorySpendingItem,
  IncomeVsExpenseItem,
  SpendingDistribution,
  PeriodComparison,
} from "../types";

export const PREVIEW_ANALYTICS_SUMMARY: AnalyticsSummary = {
  periodLabel: "October 2026",
  totalExpensesPaise: 4425000, // ₹44,250.00
  eligibleIncomePaise: 9500000, // ₹95,000.00
  netCashFlowPaise: 5075000, // ₹50,750.00
  avgDailySpendingPaise: 210714, // ₹2,107.14
  highestSpendingDay: {
    date: "2026-10-15",
    amountPaise: 840000, // ₹8,400.00
  },
  transactionCount: 28,
};

export const PREVIEW_SPENDING_TREND_DAILY: SpendingTrendPoint[] = [
  { date: "2026-10-01", label: "Oct 1", expensesPaise: 120000, incomePaise: 9500000 },
  { date: "2026-10-03", label: "Oct 3", expensesPaise: 240000, incomePaise: 0 },
  { date: "2026-10-06", label: "Oct 6", expensesPaise: 150000, incomePaise: 0 },
  { date: "2026-10-08", label: "Oct 8", expensesPaise: 380000, incomePaise: 0 },
  { date: "2026-10-11", label: "Oct 11", expensesPaise: 220000, incomePaise: 0 },
  { date: "2026-10-14", label: "Oct 14", expensesPaise: 460000, incomePaise: 0 },
  { date: "2026-10-15", label: "Oct 15", expensesPaise: 840000, incomePaise: 0 },
  { date: "2026-10-17", label: "Oct 17", expensesPaise: 195000, incomePaise: 0 },
  { date: "2026-10-19", label: "Oct 19", expensesPaise: 310000, incomePaise: 0 },
  { date: "2026-10-21", label: "Oct 21", expensesPaise: 1510000, incomePaise: 0 },
];

export const PREVIEW_SPENDING_TREND_WEEKLY: SpendingTrendPoint[] = [
  { date: "2026-W39", label: "Week 39 (Oct 1-4)", expensesPaise: 850000, incomePaise: 9500000 },
  { date: "2026-W40", label: "Week 40 (Oct 5-11)", expensesPaise: 1120000, incomePaise: 0 },
  { date: "2026-W41", label: "Week 41 (Oct 12-18)", expensesPaise: 1650000, incomePaise: 0 },
  { date: "2026-W42", label: "Week 42 (Oct 19-21)", expensesPaise: 805000, incomePaise: 0 },
];

export const PREVIEW_SPENDING_TREND_MONTHLY: SpendingTrendPoint[] = [
  { date: "2026-07", label: "July 2026", expensesPaise: 4100000, incomePaise: 8500000 },
  { date: "2026-08", label: "August 2026", expensesPaise: 4650000, incomePaise: 8500000 },
  { date: "2026-09", label: "September 2026", expensesPaise: 4800000, incomePaise: 9000000 },
  { date: "2026-10", label: "October 2026", expensesPaise: 4425000, incomePaise: 9500000 },
];

export const PREVIEW_CATEGORY_BREAKDOWN: CategorySpendingItem[] = [
  {
    category: "Food & Groceries",
    slug: "groceries",
    amountPaise: 1620000,
    percentage: 36.6,
    transactionCount: 11,
    color: "#3A5A40", // Primary
  },
  {
    category: "Living Expenses",
    slug: "living",
    amountPaise: 1050000,
    percentage: 23.7,
    transactionCount: 4,
    color: "#588157", // Secondary
  },
  {
    category: "Dining & Entertainment",
    slug: "dining",
    amountPaise: 800000,
    percentage: 18.1,
    transactionCount: 6,
    color: "#A3B18A", // Sage
  },
  {
    category: "Utilities & Bills",
    slug: "utilities",
    amountPaise: 320000,
    percentage: 7.2,
    transactionCount: 3,
    color: "#325E82", // Blue/Transfers
  },
  {
    category: "Shopping & Personal",
    slug: "shopping",
    amountPaise: 240000,
    percentage: 5.4,
    transactionCount: 2,
    color: "#8F5E14", // Amber/Pending
  },
  {
    category: "Transit & Fuel",
    slug: "transit",
    amountPaise: 210000,
    percentage: 4.7,
    transactionCount: 5,
    color: "#344E41", // Dark Green
  },
  {
    category: "Other Expenses",
    slug: "other",
    amountPaise: 185000,
    percentage: 4.2,
    transactionCount: 2,
    color: "#5B685D", // Muted
  },
];

export const PREVIEW_INCOME_VS_EXPENSE: IncomeVsExpenseItem[] = [
  {
    period: "Jul 2026",
    eligibleIncomePaise: 8500000,
    personalExpensePaise: 4100000,
    netSavingsPaise: 4400000,
  },
  {
    period: "Aug 2026",
    eligibleIncomePaise: 8500000,
    personalExpensePaise: 4650000,
    netSavingsPaise: 3850000,
  },
  {
    period: "Sep 2026",
    eligibleIncomePaise: 9000000,
    personalExpensePaise: 4800000,
    netSavingsPaise: 4200000,
  },
  {
    period: "Oct 2026",
    eligibleIncomePaise: 9500000,
    personalExpensePaise: 4425000,
    netSavingsPaise: 5075000,
  },
];

export const PREVIEW_SPENDING_DISTRIBUTION: SpendingDistribution = {
  byAccount: [
    { name: "HDFC Salary Account", amountPaise: 2850000, percentage: 64.4, count: 18 },
    { name: "ICICI Digital Wallet", amountPaise: 1125000, percentage: 25.4, count: 8 },
    { name: "Cash Wallet", amountPaise: 450000, percentage: 10.2, count: 2 },
  ],
  byPaymentMethod: [
    { name: "UPI QR / Direct", amountPaise: 2520000, percentage: 57.0, count: 16 },
    { name: "Debit Card", amountPaise: 1455000, percentage: 32.9, count: 10 },
    { name: "Physical Cash", amountPaise: 450000, percentage: 10.2, count: 2 },
  ],
  byMerchant: [
    { name: "Nature's Basket & Supermarket", amountPaise: 1120000, percentage: 25.3, count: 6 },
    { name: "Apartment Society Office", amountPaise: 1050000, percentage: 23.7, count: 2 },
    { name: "Third Wave Coffee & Cafes", amountPaise: 580000, percentage: 13.1, count: 5 },
    { name: "ACT Broadband Provider", amountPaise: 320000, percentage: 7.2, count: 1 },
    { name: "Blinkit Instant Delivery", amountPaise: 290000, percentage: 6.6, count: 4 },
  ],
  byPerson: [
    { name: "Self (Sole Expenses)", amountPaise: 3225000, percentage: 72.9, count: 21 },
    { name: "Vikram Mehta (Shared Split)", amountPaise: 750000, percentage: 16.9, count: 4 },
    { name: "Ananya Sharma (Roommate)", amountPaise: 450000, percentage: 10.2, count: 3 },
  ],
};

export const PREVIEW_PERIOD_COMPARISON: PeriodComparison = {
  currentPeriodLabel: "October 2026",
  previousPeriodLabel: "September 2026",
  currentExpensePaise: 4425000,
  previousExpensePaise: 4800000,
  changePaise: -375000,
  changePercent: -7.8,
  trendDirection: "decreased",
  currentIncomePaise: 9500000,
  previousIncomePaise: 9000000,
};
