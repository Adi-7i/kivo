export type AccountKind = "cash" | "bank" | "wallet";

export interface AccountEntity {
  id: string;
  name: string;
  kind: AccountKind;
  balancePaise: number;
  openingBalancePaise: number;
  openedOn: string;
  archived: boolean;
  createdAt: string;
}

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  bank: "Bank Account",
  cash: "Physical Cash",
  wallet: "Digital Wallet",
};
