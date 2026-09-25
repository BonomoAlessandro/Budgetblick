import { HEALTH_INSURANCE_CATEGORY_ID } from '../db/defaultCategories';
import type { RecurringExpense } from '../types';

export const HEALTH_INSURANCE_HINT_TEXT =
  'Krankenkassenwechsel: Kündigung der Grundversicherung bis 30. November möglich (Eingang beim Versicherer).';

/** Einstellung: Jahr, in dem der Hinweis ausgeblendet wurde. */
export const SETTING_HEALTH_HINT_DISMISSED_YEAR = 'healthInsuranceHintDismissedYear';

/**
 * Hinweis zum Krankenkassenwechsel: vom 1. Oktober bis 30. November, nur wenn eine
 * aktive Fixkosten-Position der Kategorie Krankenkasse existiert und der Hinweis
 * in diesem Jahr nicht ausgeblendet wurde.
 */
export function showHealthInsuranceHint(
  todayISO: string,
  recurring: RecurringExpense[],
  dismissedYear?: number,
): boolean {
  const year = Number(todayISO.slice(0, 4));
  const monthDay = todayISO.slice(5);
  const inSeason = monthDay >= '10-01' && monthDay <= '11-30';
  const hasHealthInsurance = recurring.some(
    (r) => r.active && r.categoryId === HEALTH_INSURANCE_CATEGORY_ID,
  );
  return inSeason && hasHealthInsurance && dismissedYear !== year;
}
