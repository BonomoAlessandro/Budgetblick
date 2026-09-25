import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from '../db/defaultCategories';
import type { Category, Expense } from '../types';
import { OTHER_SLICE_ID, groupByDay, latestExpenses, sumByCategory } from './expenses';

const variable = DEFAULT_CATEGORIES.filter((c) => c.kind === 'variable');

let seq = 0;
function exp(categoryId: string, amount: number, date = '2026-09-25', createdAt?: number): Expense {
  seq += 1;
  return { id: `e${seq}`, amount, date, categoryId, source: 'manual', createdAt };
}

describe('groupByDay', () => {
  it('gruppiert nach Tag, neueste zuerst, mit Tagessumme', () => {
    const a = exp('var-lebensmittel', 1000, '2026-09-24', 1);
    const b = exp('var-lebensmittel', 250, '2026-09-25', 1);
    const c = exp('var-restaurant', 750, '2026-09-25', 2);
    const groups = groupByDay([a, b, c]);
    expect(groups.map((g) => g.date)).toEqual(['2026-09-25', '2026-09-24']);
    expect(groups[0]!.total).toBe(1000);
    expect(groups[0]!.expenses).toEqual([c, b]);
  });
});

describe('sumByCategory', () => {
  it('summiert pro Kategorie in Kategorienreihenfolge mit Anteilen', () => {
    const slices = sumByCategory(
      [exp('var-sonstiges', 1000), exp('var-lebensmittel', 2000), exp('var-lebensmittel', 1000)],
      variable,
    );
    expect(slices.map((s) => [s.id, s.total])).toEqual([
      ['var-lebensmittel', 3000],
      ['var-sonstiges', 1000],
    ]);
    expect(slices[0]!.share).toBe(0.75);
  });

  it('fasst überzählige Kategorien zu „Weitere" zusammen', () => {
    const many: Category[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      name: `K${i}`,
      icon: '•',
      color: '#000000',
      kind: 'variable',
    }));
    const list = many.map((c, i) => exp(c.id, (i + 1) * 100));
    const slices = sumByCategory(list, many, 8);
    expect(slices).toHaveLength(8);
    const other = slices.at(-1)!;
    expect(other.id).toBe(OTHER_SLICE_ID);
    // Die drei kleinsten (100, 200, 300) werden zusammengefasst
    expect(other.total).toBe(600);
    expect(slices.slice(0, 7).map((s) => s.id)).toEqual(['c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 10);
  });

  it('liefert eine leere Liste ohne Ausgaben', () => {
    expect(sumByCategory([], variable)).toEqual([]);
  });
});

describe('latestExpenses', () => {
  it('sortiert nach Datum und Erfassungszeit', () => {
    const old = exp('var-lebensmittel', 1, '2026-09-01', 999);
    const first = exp('var-lebensmittel', 2, '2026-09-25', 1);
    const second = exp('var-lebensmittel', 3, '2026-09-25', 2);
    expect(latestExpenses([old, first, second], 2)).toEqual([second, first]);
  });
});
