export type ExpenseCategory = 'food' | 'transit' | 'lodging' | 'sightseeing' | 'shopping';

export interface ExpenseEntry {
  id: string;
  title: string;
  amountJpy: number;
  category: ExpenseCategory;
  city: string;
  date: string;
  createdAt: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  label: string;
  totalJpy: number;
  percentage: number;
  color: string;
}

export interface BudgetSummary {
  totalSpentJpy: number;
  dailyBudgetJpy: number;
  tripDays: number;
  totalBudgetJpy: number;
  remainingJpy: number;
  dailyAverageJpy: number;
  percentUsed: number;
  status: 'nominal' | 'warning' | 'over';
  categories: CategorySummary[];
}

export const EXPENSE_CATEGORIES: Array<{ id: ExpenseCategory; label: string; color: string }> = [
  { id: 'food', label: 'Dining & Street Food', color: '#F5C451' },
  { id: 'transit', label: 'Rail & IC Transit', color: '#38BDF8' },
  { id: 'lodging', label: 'Ryokan & Hotels', color: '#A78BFA' },
  { id: 'sightseeing', label: 'Temples & Museums', color: '#34D399' },
  { id: 'shopping', label: 'Crafts & Shopping', color: '#FB7185' },
];

export function summarizeBudget(
  expenses: ExpenseEntry[],
  dailyBudgetJpy: number,
  tripDays: number
): BudgetSummary {
  const safeDaily = Math.max(1000, Number.isFinite(dailyBudgetJpy) ? dailyBudgetJpy : 18000);
  const safeDays = Math.max(1, Math.round(Number.isFinite(tripDays) ? tripDays : 7));
  const totalBudgetJpy = safeDaily * safeDays;

  const totalsByCategory: Record<ExpenseCategory, number> = {
    food: 0,
    transit: 0,
    lodging: 0,
    sightseeing: 0,
    shopping: 0,
  };

  let totalSpentJpy = 0;
  const uniqueDates = new Set<string>();

  for (const item of expenses) {
    const amount = Number.isFinite(item.amountJpy) && item.amountJpy > 0 ? item.amountJpy : 0;
    totalSpentJpy += amount;
    if (item.category in totalsByCategory) {
      totalsByCategory[item.category] += amount;
    }
    if (item.date) uniqueDates.add(item.date);
  }

  const remainingJpy = totalBudgetJpy - totalSpentJpy;
  const activeDays = Math.max(1, uniqueDates.size);
  const dailyAverageJpy = Math.round(totalSpentJpy / activeDays);
  const percentUsed = totalBudgetJpy > 0 ? Math.round((totalSpentJpy / totalBudgetJpy) * 100) : 0;

  let status: BudgetSummary['status'] = 'nominal';
  if (totalSpentJpy > totalBudgetJpy) {
    status = 'over';
  } else if (percentUsed >= 80) {
    status = 'warning';
  }

  const categories: CategorySummary[] = EXPENSE_CATEGORIES.map((cat) => {
    const totalJpy = totalsByCategory[cat.id];
    const percentage = totalSpentJpy > 0 ? Math.round((totalJpy / totalSpentJpy) * 100) : 0;
    return {
      category: cat.id,
      label: cat.label,
      totalJpy,
      percentage,
      color: cat.color,
    };
  });

  return {
    totalSpentJpy,
    dailyBudgetJpy: safeDaily,
    tripDays: safeDays,
    totalBudgetJpy,
    remainingJpy,
    dailyAverageJpy,
    percentUsed,
    status,
    categories,
  };
}
