export type BudgetCategoryId = 'meat' | 'vegetables' | 'beverages' | 'snacks' | 'household' | 'others';

export type BudgetCategory = {
  id: BudgetCategoryId;
  label: string;
  icon: string;
};

export const DEFAULT_CATEGORY: BudgetCategoryId = 'others';

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'meat', label: 'Meat', icon: 'restaurant-outline' },
  { id: 'vegetables', label: 'Vegetables', icon: 'leaf-outline' },
  { id: 'beverages', label: 'Beverages', icon: 'cafe-outline' },
  { id: 'snacks', label: 'Snacks', icon: 'fast-food-outline' },
  { id: 'household', label: 'Household', icon: 'home-outline' },
  { id: 'others', label: 'Others', icon: 'basket-outline' },
];

export type CategoryBudgets = Record<BudgetCategoryId, number>;

export const createEmptyCategoryBudgets = (): CategoryBudgets => ({
  meat: 0,
  vegetables: 0,
  beverages: 0,
  snacks: 0,
  household: 0,
  others: 0,
});

export const getCategoryLabel = (id?: string) =>
  BUDGET_CATEGORIES.find((category) => category.id === id)?.label ?? 'Others';
