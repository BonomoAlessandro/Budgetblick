import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from '../db/defaultCategories';
import type { Category } from '../types';
import { applyCategoryOrder, DEFAULT_ENTRY_ORDER, reorderIds } from './categoryOrder';

const variable = DEFAULT_CATEGORIES.filter((c) => c.kind === 'variable');
const custom: Category = {
  id: 'c-haushalt',
  name: 'Haushalt',
  icon: '🧴',
  color: '#64748b',
  kind: 'variable',
};
const ids = (list: Category[]) => list.map((c) => c.id);

describe('applyCategoryOrder', () => {
  it('ordnet die Standardkategorien in der gewünschten Standardreihenfolge', () => {
    expect(ids(applyCategoryOrder(variable, DEFAULT_ENTRY_ORDER))).toEqual([
      'var-lebensmittel',
      'var-restaurant',
      'var-freizeit',
      'var-shopping',
      'var-reisen',
      'var-transport',
      'var-sonstiges',
    ]);
  });

  it('hängt nicht aufgeführte Kategorien an und ignoriert unbekannte IDs', () => {
    const order = ['var-sonstiges', 'gibt-es-nicht', 'var-lebensmittel'];
    const result = ids(applyCategoryOrder([...variable, custom], order));
    expect(result.slice(0, 2)).toEqual(['var-sonstiges', 'var-lebensmittel']);
    expect(result.at(-1)).toBe('c-haushalt');
    expect(result).toHaveLength(variable.length + 1);
  });
});

describe('reorderIds', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('zieht einen Eintrag nach unten oder oben an die Zielposition', () => {
    expect(reorderIds(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(reorderIds(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('lässt die Reihenfolge unverändert ohne Ziel oder beim Ablegen am selben Platz', () => {
    expect(reorderIds(order, 'b', 'b')).toBe(order);
    expect(reorderIds(order, 'b', undefined)).toBe(order);
    expect(reorderIds(order, 'x', 'a')).toBe(order);
  });
});
