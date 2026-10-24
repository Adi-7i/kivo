export interface CategoryEntity {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  color?: string;
  isExpense?: boolean;
  parent?: string | null;
  archived?: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

export type { CategoryFormData } from "../schemas/category.schema";
