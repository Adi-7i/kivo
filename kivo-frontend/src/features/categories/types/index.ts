export interface CategoryEntity {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  color?: string;
  isExpense: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

export interface CategoryFormData {
  name: string;
  color?: string;
  icon?: string;
  isExpense: boolean;
}
