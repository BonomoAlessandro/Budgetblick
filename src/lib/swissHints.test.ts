import { describe, expect, it } from 'vitest';
import type { RecurringExpense } from '../types';
import { showHealthInsuranceHint } from './swissHints';

const kk: RecurringExpense = {
  id: 'kk',
  name: 'Grundversicherung',
  amount: 42000,
  interval: 'monthly',
  nextDueDate: '2026-10-01',
  categoryId: 'fix-krankenkasse',
  active: true,
};

describe('showHealthInsuranceHint', () => {
  it.each([
    ['2026-09-30', false],
    ['2026-10-01', true],
    ['2026-11-15', true],
    ['2026-11-30', true],
    ['2026-12-01', false],
    ['2026-01-15', false],
  ])('%s → %s', (today, expected) => {
    expect(showHealthInsuranceHint(today, [kk])).toBe(expected);
  });

  it('erscheint nur mit aktiver Krankenkassen-Position', () => {
    expect(showHealthInsuranceHint('2026-10-15', [])).toBe(false);
    expect(showHealthInsuranceHint('2026-10-15', [{ ...kk, active: false }])).toBe(false);
    expect(showHealthInsuranceHint('2026-10-15', [{ ...kk, categoryId: 'fix-wohnen' }])).toBe(
      false,
    );
  });

  it('bleibt im Jahr des Ausblendens verborgen und kommt im Folgejahr wieder', () => {
    expect(showHealthInsuranceHint('2026-10-15', [kk], 2026)).toBe(false);
    expect(showHealthInsuranceHint('2027-10-15', [kk], 2026)).toBe(true);
  });
});
