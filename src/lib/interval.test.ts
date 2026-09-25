import { describe, expect, it } from 'vitest';
import {
  monthlyEquivalent,
  nextOccurrence,
  nextOccurrences,
  nthOccurrence,
  yearlyEquivalent,
} from './interval';

describe('monthlyEquivalent', () => {
  it.each([
    ['weekly', 1200, 5200],
    ['monthly', 150000, 150000],
    ['quarterly', 30000, 10000],
    ['semiannual', 60000, 10000],
    ['yearly', 33500, 33500 / 12],
  ] as const)('%s: %i → %f', (interval, amount, expected) => {
    expect(monthlyEquivalent(amount, interval)).toBeCloseTo(expected, 10);
  });

  it('rechnet wöchentlich mit 52/12 statt 4 Wochen', () => {
    expect(monthlyEquivalent(1000, 'weekly')).toBeCloseTo(4333.333, 3);
  });
});

describe('yearlyEquivalent', () => {
  it.each([
    ['weekly', 1000, 52000],
    ['monthly', 1000, 12000],
    ['quarterly', 1000, 4000],
    ['semiannual', 1000, 2000],
    ['yearly', 1000, 1000],
  ] as const)('%s: %i → %i', (interval, amount, expected) => {
    expect(yearlyEquivalent(amount, interval)).toBe(expected);
  });
});

describe('nthOccurrence', () => {
  it('klemmt Monatsenden, ohne dass der Tag wandert', () => {
    expect(nthOccurrence('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
    expect(nthOccurrence('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
    expect(nthOccurrence('2026-01-31', 'monthly', 3)).toBe('2026-04-30');
  });

  it('berücksichtigt Schaltjahre', () => {
    expect(nthOccurrence('2028-01-31', 'monthly', 1)).toBe('2028-02-29');
    expect(nthOccurrence('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
    expect(nthOccurrence('2024-02-29', 'yearly', 4)).toBe('2028-02-29');
  });

  it('rechnet Quartale und Halbjahre', () => {
    expect(nthOccurrence('2026-11-30', 'quarterly', 1)).toBe('2027-02-28');
    expect(nthOccurrence('2026-08-31', 'semiannual', 1)).toBe('2027-02-28');
  });

  it('rechnet Wochen über Jahresgrenzen', () => {
    expect(nthOccurrence('2026-12-28', 'weekly', 1)).toBe('2027-01-04');
  });
});

describe('nextOccurrence', () => {
  it('liefert den Anker, wenn er in der Zukunft oder heute liegt', () => {
    expect(nextOccurrence('2026-10-01', 'monthly', '2026-09-25')).toBe('2026-10-01');
    expect(nextOccurrence('2026-09-25', 'monthly', '2026-09-25')).toBe('2026-09-25');
  });

  it('rechnet vergangene Fälligkeiten weiter', () => {
    expect(nextOccurrence('2026-01-15', 'monthly', '2026-09-25')).toBe('2026-10-15');
    expect(nextOccurrence('2026-01-25', 'monthly', '2026-09-25')).toBe('2026-09-25');
    expect(nextOccurrence('2025-03-01', 'yearly', '2026-09-25')).toBe('2027-03-01');
    expect(nextOccurrence('2026-01-01', 'quarterly', '2026-09-25')).toBe('2026-10-01');
  });

  it('behält das Monatsende beim Weiterrechnen', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-09-01')).toBe('2026-09-30');
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-10-01')).toBe('2026-10-31');
  });

  it('rechnet wöchentliche Fälligkeiten weiter', () => {
    // 2026-09-04 ist ein Freitag, 2026-09-25 ebenfalls
    expect(nextOccurrence('2026-09-04', 'weekly', '2026-09-25')).toBe('2026-09-25');
    expect(nextOccurrence('2026-09-04', 'weekly', '2026-09-26')).toBe('2026-10-02');
  });

  it('funktioniert mit weit zurückliegenden Ankern', () => {
    expect(nextOccurrence('2000-02-29', 'yearly', '2026-09-25')).toBe('2027-02-28');
    expect(nextOccurrence('2010-01-07', 'weekly', '2026-09-25')).toBe('2026-10-01');
  });
});

describe('nextOccurrences', () => {
  it('liefert mehrere künftige Fälligkeiten', () => {
    expect(nextOccurrences('2026-01-31', 'monthly', '2026-09-25', 3)).toEqual([
      '2026-09-30',
      '2026-10-31',
      '2026-11-30',
    ]);
  });
});
