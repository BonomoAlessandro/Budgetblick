import type { Category } from '../types';

/** Standardreihenfolge der variablen Kategorien beim Erfassen einer Ausgabe. */
export const DEFAULT_ENTRY_ORDER = [
  'var-lebensmittel',
  'var-restaurant',
  'var-freizeit',
  'var-shopping',
  'var-reisen',
  'var-transport',
  'var-sonstiges',
];

/**
 * Sortiert Kategorien nach einer gespeicherten Reihenfolge (Liste von IDs).
 * Nicht aufgeführte Kategorien (z.B. neu angelegte) folgen in ihrer bisherigen
 * Reihenfolge, unbekannte IDs in der Liste werden ignoriert.
 */
export function applyCategoryOrder(categories: Category[], order: readonly string[]): Category[] {
  const position = new Map(order.map((id, i) => [id, i]));
  return categories
    .map((category, index) => ({ category, index, pos: position.get(category.id) }))
    .sort(
      (a, b) =>
        (a.pos ?? Number.MAX_SAFE_INTEGER) - (b.pos ?? Number.MAX_SAFE_INTEGER) ||
        a.index - b.index,
    )
    .map((x) => x.category);
}

/** Neue Reihenfolge der IDs, nachdem `activeId` auf den Platz von `overId` gezogen wurde. */
export function reorderIds(ids: string[], activeId: string, overId: string | undefined): string[] {
  const from = ids.indexOf(activeId);
  const to = overId === undefined ? -1 : ids.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
