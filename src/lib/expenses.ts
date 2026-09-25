import type { Category, Expense } from '../types';

/** Neueste zuerst: Datum absteigend, bei gleichem Datum nach Erfassungszeitpunkt. */
export function compareNewestFirst(a: Expense, b: Expense): number {
  return b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0);
}

export interface DayGroup {
  date: string;
  total: number;
  expenses: Expense[];
}

/** Gruppiert Ausgaben nach Tag, neueste zuerst. */
export function groupByDay(expenses: Expense[]): DayGroup[] {
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = groups.get(e.date);
    if (list) list.push(e);
    else groups.set(e.date, [e]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({
      date,
      total: list.reduce((s, e) => s + e.amount, 0),
      expenses: [...list].sort(compareNewestFirst),
    }));
}

export interface CategorySlice {
  /** Kategorie-ID oder `other` für zusammengefasste Kategorien */
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  /** Anteil 0..1 */
  share: number;
}

export const OTHER_SLICE_ID = 'other';

/**
 * Summen pro Kategorie für das Donut-Diagramm. Die Reihenfolge folgt der
 * Kategorienliste (nicht dem Betrag), damit benachbarte Farben stabil bleiben.
 * Mehr als `maxSlices` Kategorien werden zu „Weitere" zusammengefasst.
 */
export function sumByCategory(
  expenses: Expense[],
  categories: Category[],
  maxSlices = 8,
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
  const grand = [...totals.values()].reduce((s, v) => s + v, 0);
  if (grand === 0) return [];

  const known = new Map(categories.map((c, index) => [c.id, { c, index }]));
  const slices = [...totals.entries()]
    .filter(([, total]) => total > 0)
    .map(([id, total]) => {
      const entry = known.get(id);
      return {
        index: entry?.index ?? Number.MAX_SAFE_INTEGER,
        slice: {
          id,
          name: entry?.c.name ?? 'Unbekannt',
          icon: entry?.c.icon ?? '❔',
          color: entry?.c.color ?? '#64748b',
          total,
          share: total / grand,
        },
      };
    });

  if (slices.length > maxSlices) {
    // Die kleinsten Kategorien in „Weitere" zusammenfassen.
    const byTotal = [...slices].sort((a, b) => b.slice.total - a.slice.total);
    const keep = new Set(byTotal.slice(0, maxSlices - 1));
    const restTotal = byTotal.slice(maxSlices - 1).reduce((s, x) => s + x.slice.total, 0);
    const kept = slices.filter((x) => keep.has(x)).sort((a, b) => a.index - b.index);
    return [
      ...kept.map((x) => x.slice),
      {
        id: OTHER_SLICE_ID,
        name: 'Weitere',
        icon: '…',
        color: '#64748b',
        total: restTotal,
        share: restTotal / grand,
      },
    ];
  }
  return slices.sort((a, b) => a.index - b.index).map((x) => x.slice);
}

/** Die `limit` neuesten Ausgaben (Datum absteigend). */
export function latestExpenses(expenses: Expense[], limit = 5): Expense[] {
  return [...expenses].sort(compareNewestFirst).slice(0, limit);
}
