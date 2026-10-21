/** Константный набор категорий MVP (раздел 5.4 ТЗ). Доходы — отдельная категория. */
export const EXPENSE_CATEGORIES = [
  { id: 'housing', label: 'Жильё и коммуналка' },
  { id: 'groceries', label: 'Продукты' },
  { id: 'transport', label: 'Транспорт' },
  { id: 'health', label: 'Здоровье' },
  { id: 'leisure', label: 'Досуг' },
  { id: 'shopping', label: 'Покупки' },
  { id: 'subscriptions', label: 'Подписки' },
  { id: 'other', label: 'Другое' },
] as const;

export const INCOME_CATEGORY = { id: 'income', label: 'Доход' } as const;

export type CategoryId = (typeof EXPENSE_CATEGORIES)[number]['id'] | typeof INCOME_CATEGORY.id;

export const CATEGORY_IDS: string[] = [...EXPENSE_CATEGORIES.map((c) => c.id), INCOME_CATEGORY.id];

export function categoryLabel(id: string): string {
  if (id === INCOME_CATEGORY.id) return INCOME_CATEGORY.label;
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? 'Другое';
}
