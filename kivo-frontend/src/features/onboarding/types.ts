export type AccountType = "cash" | "bank" | "wallet";

export interface AccountTypeOption {
  type: AccountType;
  label: string;
  description: string;
  iconName: "Banknote" | "Building2" | "Wallet";
}

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  {
    type: "bank",
    label: "Bank Account",
    description: "Checking, savings, or salary accounts",
    iconName: "Building2",
  },
  {
    type: "cash",
    label: "Physical Cash",
    description: "Cash in wallet, safe, or emergency stash",
    iconName: "Banknote",
  },
  {
    type: "wallet",
    label: "Digital Wallet",
    description: "Prepaid wallets and mobile money balances",
    iconName: "Wallet",
  },
];

export interface OnboardingPersonalData {
  displayName: string;
  currency: "INR";
  timezone: "Asia/Kolkata";
}

export interface OnboardingAccountData {
  accountName: string;
  accountType: AccountType;
  openingBalance: string;
  openingDate: string;
}

export interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  personal: OnboardingPersonalData;
  account: Partial<OnboardingAccountData>;
}
