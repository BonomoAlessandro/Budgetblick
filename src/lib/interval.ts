import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
} from 'date-fns';
import type { Interval } from '../types';
import { fromISODate, toISODate } from './date';

export const INTERVALS: Interval[] = ['weekly', 'monthly', 'quarterly', 'semiannual', 'yearly'];

export const INTERVAL_LABELS: Record<Interval, string> = {
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  quarterly: 'Vierteljährlich',
  semiannual: 'Halbjährlich',
  yearly: 'Jährlich',
};

/** Anzahl Monate pro Intervall (ausser wöchentlich). */
const MONTHS_PER_INTERVAL: Record<Exclude<Interval, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

/**
 * Rechnet einen Betrag (Rappen) auf den Monat um. Das Ergebnis ist bewusst
 * nicht gerundet (wöchentlich × 52/12), gerundet wird erst bei Summen bzw. der Anzeige.
 */
export function monthlyEquivalent(amount: number, interval: Interval): number {
  if (interval === 'weekly') return (amount * 52) / 12;
  return amount / MONTHS_PER_INTERVAL[interval];
}

/** Rechnet einen Betrag (Rappen) auf das Jahr um. */
export function yearlyEquivalent(amount: number, interval: Interval): number {
  if (interval === 'weekly') return amount * 52;
  return (amount * 12) / MONTHS_PER_INTERVAL[interval];
}

/**
 * n-te Fälligkeit ab einem Ankerdatum (n = 0 ist der Anker selbst).
 * Wird immer vom Anker aus berechnet, damit Monatsenden nicht „wandern":
 * 31.01. → 28./29.02. → 31.03. (und nicht 28.03.).
 */
export function nthOccurrence(anchorISO: string, interval: Interval, n: number): string {
  const anchor = fromISODate(anchorISO);
  const date =
    interval === 'weekly'
      ? addWeeks(anchor, n)
      : addMonths(anchor, n * MONTHS_PER_INTERVAL[interval]);
  return toISODate(date);
}

/** Index n der ersten Fälligkeit am oder nach `fromISO`. */
function indexOfNext(anchorISO: string, interval: Interval, fromISO: string): number {
  if (anchorISO >= fromISO) return 0;
  const anchor = fromISODate(anchorISO);
  const from = fromISODate(fromISO);

  // Schätzung knapp unterhalb des Ziels, danach vorwärts suchen.
  let n =
    interval === 'weekly'
      ? Math.floor(differenceInCalendarDays(from, anchor) / 7)
      : Math.max(
          0,
          Math.floor(differenceInCalendarMonths(from, anchor) / MONTHS_PER_INTERVAL[interval]) - 1,
        );
  while (nthOccurrence(anchorISO, interval, n) < fromISO) n += 1;
  return n;
}

/** Erste Fälligkeit am oder nach `fromISO`. */
export function nextOccurrence(anchorISO: string, interval: Interval, fromISO: string): string {
  return nthOccurrence(anchorISO, interval, indexOfNext(anchorISO, interval, fromISO));
}

/** Die nächsten `count` Fälligkeiten am oder nach `fromISO`. */
export function nextOccurrences(
  anchorISO: string,
  interval: Interval,
  fromISO: string,
  count: number,
): string[] {
  const start = indexOfNext(anchorISO, interval, fromISO);
  return Array.from({ length: count }, (_, i) => nthOccurrence(anchorISO, interval, start + i));
}
