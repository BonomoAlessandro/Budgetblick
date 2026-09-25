import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Category, CategoryKind } from '../types';
import { db } from './db';

export function useCategories(kind?: CategoryKind): Category[] | undefined {
  return useLiveQuery(
    () =>
      kind
        ? db.categories.where('kind').equals(kind).sortBy('name')
        : db.categories.orderBy('name').toArray(),
    [kind],
  );
}

export function useCategoryMap(): Map<string, Category> {
  const categories = useCategories();
  return useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
}

export function useIncomes() {
  return useLiveQuery(() => db.incomes.orderBy('name').toArray(), []);
}

export function useRecurringExpenses() {
  return useLiveQuery(() => db.recurringExpenses.toArray(), []);
}

/** Variable Ausgaben zwischen zwei ISO-Daten (inklusive). */
export function useExpensesBetween(fromISO: string, toISO: string) {
  return useLiveQuery(
    () => db.expenses.where('date').between(fromISO, toISO, true, true).toArray(),
    [fromISO, toISO],
  );
}
