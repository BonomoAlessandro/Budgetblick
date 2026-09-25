import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Category, CategoryKind } from '../types';
import { db } from './db';
import { DEFAULT_CATEGORIES } from './defaultCategories';

const DEFAULT_ORDER = new Map(DEFAULT_CATEGORIES.map((c, i) => [c.id, i]));

/** Standardkategorien in ihrer festen Reihenfolge, eigene Kategorien danach alphabetisch. */
export function orderCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const ia = DEFAULT_ORDER.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const ib = DEFAULT_ORDER.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib || a.name.localeCompare(b.name, 'de');
  });
}

export function useCategories(kind?: CategoryKind): Category[] | undefined {
  return useLiveQuery(
    async () =>
      orderCategories(
        kind
          ? await db.categories.where('kind').equals(kind).toArray()
          : await db.categories.toArray(),
      ),
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

/** Die neuesten variablen Ausgaben (für „Letzte Ausgaben" und die Kategorie-Häufigkeit). */
export function useRecentExpenses(limit: number) {
  return useLiveQuery(() => db.expenses.orderBy('date').reverse().limit(limit).toArray(), [limit]);
}

/** Einstellung aus der Datenbank, mit Standardwert solange nichts gespeichert ist. */
export function useSetting<T>(key: string, fallback: T): T {
  const setting = useLiveQuery(() => db.settings.get(key), [key]);
  return (setting?.value as T | undefined) ?? fallback;
}

export const SETTING_REMINDER_LEAD_DAYS = 'reminderLeadDays';
