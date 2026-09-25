import type { Expense, Income, Interval, RecurringExpense } from '../types';
import { cancelledUntil } from './contracts';
import { toISODate } from './date';
import { monthlyEquivalent, nextOccurrence, nextOccurrences, yearlyEquivalent } from './interval';

interface Periodic {
  amount: number;
  interval: Interval;
}

/** Summe der Monatsäquivalente in Rappen (gerundet). */
export function sumMonthly(items: Periodic[]): number {
  return Math.round(items.reduce((sum, i) => sum + monthlyEquivalent(i.amount, i.interval), 0));
}

/** Summe der Jahresäquivalente in Rappen (gerundet). */
export function sumYearly(items: Periodic[]): number {
  return Math.round(items.reduce((sum, i) => sum + yearlyEquivalent(i.amount, i.interval), 0));
}

/** Präfix `YYYY-MM` des Monats, in dem `date` liegt. */
export function monthKey(date: Date): string {
  return toISODate(date).slice(0, 7);
}

/** Variable Ausgaben, die im Monat von `month` liegen. */
export function expensesInMonth(expenses: Expense[], month: Date): Expense[] {
  const key = monthKey(month);
  return expenses.filter((e) => e.date.startsWith(key));
}

export interface BudgetSummary {
  /** Einkommen pro Monat */
  income: number;
  /** Aktive Fixkosten pro Monat */
  fixed: number;
  /** Einkommen − Fixkosten: Budget für variable Ausgaben */
  available: number;
  /** Variable Ausgaben im Monat */
  spent: number;
  /** Frei verfügbar: available − spent */
  free: number;
  /** Anteil spent / available, 0..1 (1 bei überzogenem oder fehlendem Budget mit Ausgaben) */
  spentRatio: number;
}

/** Alle Beträge in Rappen. */
export function computeBudget(input: {
  incomes: Income[];
  recurring: RecurringExpense[];
  expenses: Expense[];
  month: Date;
}): BudgetSummary {
  const income = sumMonthly(input.incomes);
  const fixed = sumMonthly(input.recurring.filter((r) => r.active));
  const spent = expensesInMonth(input.expenses, input.month).reduce((s, e) => s + e.amount, 0);
  const available = income - fixed;
  const free = available - spent;
  const spentRatio = available > 0 ? Math.min(spent / available, 1) : spent > 0 ? 1 : 0;
  return { income, fixed, available, spent, free, spentRatio };
}

export interface UpcomingPayment {
  expense: RecurringExpense;
  date: string;
}

/**
 * Die nächsten `limit` Abbuchungen aktiver Fixkosten ab `fromISO` (inklusive).
 * Bei gekündigten Verträgen enden die Abbuchungen mit dem Vertragsende.
 */
export function upcomingPayments(
  recurring: RecurringExpense[],
  fromISO: string,
  limit = 5,
): UpcomingPayment[] {
  return recurring
    .filter((r) => r.active)
    .flatMap((expense) => {
      const until = cancelledUntil(expense);
      return nextOccurrences(expense.nextDueDate, expense.interval, fromISO, limit)
        .filter((date) => until === undefined || date <= until)
        .map((date) => ({ expense, date }));
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.expense.name.localeCompare(b.expense.name, 'de'),
    )
    .slice(0, limit);
}

export type RecurringSortKey = 'amount' | 'name' | 'due';

export const RECURRING_SORT_LABELS: Record<RecurringSortKey, string> = {
  amount: 'Betrag',
  name: 'Name',
  due: 'Fälligkeit',
};

/** Effektive nächste Fälligkeit (ein vergangenes `nextDueDate` wird weitergerechnet). */
export function effectiveDueDate(expense: RecurringExpense, fromISO: string): string {
  return nextOccurrence(expense.nextDueDate, expense.interval, fromISO);
}

/** Sortiert Fixkosten: Betrag absteigend (Monatsäquivalent), Name oder Fälligkeit aufsteigend. */
export function sortRecurring(
  items: RecurringExpense[],
  key: RecurringSortKey,
  fromISO: string,
): RecurringExpense[] {
  const byName = (a: RecurringExpense, b: RecurringExpense) => a.name.localeCompare(b.name, 'de');
  const sorted = [...items];
  switch (key) {
    case 'amount':
      return sorted.sort(
        (a, b) =>
          monthlyEquivalent(b.amount, b.interval) - monthlyEquivalent(a.amount, a.interval) ||
          byName(a, b),
      );
    case 'name':
      return sorted.sort(byName);
    case 'due':
      return sorted.sort(
        (a, b) =>
          effectiveDueDate(a, fromISO).localeCompare(effectiveDueDate(b, fromISO)) || byName(a, b),
      );
  }
}
