import { describe, expect, it } from 'vitest';
import type { Expense, Income, RecurringExpense } from '../types';
import {
  computeBudget,
  effectiveDueDate,
  expensesInMonth,
  sortRecurring,
  sumMonthly,
  sumYearly,
  upcomingPayments,
} from './budget';

function recurring(partial: Partial<RecurringExpense> & { name: string }): RecurringExpense {
  return {
    id: partial.name,
    amount: 10000,
    interval: 'monthly',
    nextDueDate: '2026-10-01',
    categoryId: 'fix-wohnen',
    active: true,
    ...partial,
  };
}

function expense(amount: number, date: string): Expense {
  return { id: `${date}-${amount}`, amount, date, categoryId: 'var-sonstiges', source: 'manual' };
}

const salary: Income = { id: 'lohn', name: 'Lohn', amount: 650000, interval: 'monthly' };

describe('sumMonthly / sumYearly', () => {
  it('summiert gemischte Intervalle und rundet erst am Schluss', () => {
    const items = [
      { amount: 100, interval: 'weekly' as const }, // 433.33…
      { amount: 100, interval: 'weekly' as const }, // 433.33…
      { amount: 100, interval: 'weekly' as const }, // 433.33…
    ];
    expect(sumMonthly(items)).toBe(1300);
    expect(sumYearly(items)).toBe(15600);
  });

  it('liefert 0 bei leerer Liste', () => {
    expect(sumMonthly([])).toBe(0);
  });
});

describe('expensesInMonth', () => {
  it('filtert nach Kalendermonat inklusive Monatsgrenzen', () => {
    const list = [
      expense(100, '2026-08-31'),
      expense(200, '2026-09-01'),
      expense(300, '2026-09-30'),
      expense(400, '2026-10-01'),
    ];
    expect(expensesInMonth(list, new Date(2026, 8, 15)).map((e) => e.amount)).toEqual([200, 300]);
  });
});

describe('computeBudget', () => {
  const month = new Date(2026, 8, 25);

  it('berechnet das frei verfügbare Budget', () => {
    const result = computeBudget({
      incomes: [salary, { id: 'b', name: 'Bonus', amount: 600000, interval: 'yearly' }],
      recurring: [
        recurring({ name: 'Miete', amount: 180000 }),
        recurring({ name: 'Krankenkasse', amount: 42000 }),
        recurring({ name: 'Serafe', amount: 33500, interval: 'yearly' }),
        recurring({ name: 'Pausiert', amount: 99900, active: false }),
      ],
      expenses: [
        expense(5000, '2026-09-02'),
        expense(2550, '2026-09-20'),
        expense(9999, '2026-08-31'),
      ],
      month,
    });
    expect(result.income).toBe(700000);
    expect(result.fixed).toBe(180000 + 42000 + 2792); // 335.00 / 12 = 27.9166…
    expect(result.available).toBe(700000 - 224792);
    expect(result.spent).toBe(7550);
    expect(result.free).toBe(700000 - 224792 - 7550);
    expect(result.spentRatio).toBeCloseTo(7550 / 475208, 10);
  });

  it('kann negativ werden, der Anteil bleibt auf 1 begrenzt', () => {
    const result = computeBudget({
      incomes: [{ ...salary, amount: 100000 }],
      recurring: [recurring({ name: 'Miete', amount: 90000 })],
      expenses: [expense(20000, '2026-09-10')],
      month,
    });
    expect(result.free).toBe(-10000);
    expect(result.spentRatio).toBe(1);
  });

  it('funktioniert ohne Daten', () => {
    expect(computeBudget({ incomes: [], recurring: [], expenses: [], month })).toEqual({
      income: 0,
      fixed: 0,
      available: 0,
      spent: 0,
      free: 0,
      spentRatio: 0,
    });
  });
});

describe('upcomingPayments', () => {
  const today = '2026-09-25';

  it('liefert die nächsten Abbuchungen sortiert und begrenzt', () => {
    const result = upcomingPayments(
      [
        recurring({ name: 'Miete', nextDueDate: '2026-10-01' }),
        recurring({ name: 'Netflix', nextDueDate: '2026-09-28' }),
        recurring({ name: 'Serafe', nextDueDate: '2027-01-31', interval: 'yearly' }),
        recurring({ name: 'Pausiert', nextDueDate: '2026-09-26', active: false }),
      ],
      today,
      5,
    );
    expect(result.map((p) => `${p.expense.name} ${p.date}`)).toEqual([
      'Netflix 2026-09-28',
      'Miete 2026-10-01',
      'Netflix 2026-10-28',
      'Miete 2026-11-01',
      'Netflix 2026-11-28',
    ]);
  });

  it('rechnet vergangene Fälligkeiten weiter und schliesst heute ein', () => {
    const result = upcomingPayments(
      [recurring({ name: 'Handy', nextDueDate: '2026-06-25' })],
      today,
      1,
    );
    expect(result[0]?.date).toBe('2026-09-25');
  });

  it('bucht gekündigte Verträge nur bis zum Vertragsende ab', () => {
    const result = upcomingPayments(
      [
        recurring({
          name: 'Fitness',
          nextDueDate: '2026-10-15',
          contract: {
            startDate: '2025-12-01',
            minTermMonths: 12,
            renewalTermMonths: 12,
            noticePeriod: { value: 1, unit: 'months' },
            reminderLeadDays: 14,
            cancelledOn: '2026-09-01',
          },
        }),
      ],
      today,
      5,
    );
    // Vertragsende 30.11.2026
    expect(result.map((p) => p.date)).toEqual(['2026-10-15', '2026-11-15']);
  });

  it('liefert eine leere Liste ohne aktive Fixkosten', () => {
    expect(upcomingPayments([], today)).toEqual([]);
  });
});

describe('sortRecurring', () => {
  const today = '2026-09-25';
  const items = [
    recurring({ name: 'Zeitung', amount: 36000, interval: 'yearly', nextDueDate: '2026-12-01' }),
    recurring({ name: 'Miete', amount: 180000, nextDueDate: '2026-10-01' }),
    recurring({
      name: 'Ärztekasse',
      amount: 12000,
      interval: 'quarterly',
      nextDueDate: '2026-01-01',
    }),
  ];

  it('sortiert nach Monatsäquivalent absteigend', () => {
    expect(sortRecurring(items, 'amount', today).map((i) => i.name)).toEqual([
      'Miete',
      'Ärztekasse',
      'Zeitung',
    ]);
  });

  it('sortiert nach Name mit deutschen Umlauten', () => {
    expect(sortRecurring(items, 'name', today).map((i) => i.name)).toEqual([
      'Ärztekasse',
      'Miete',
      'Zeitung',
    ]);
  });

  it('sortiert nach effektiver Fälligkeit', () => {
    expect(effectiveDueDate(items[2]!, today)).toBe('2026-10-01');
    expect(sortRecurring(items, 'due', today).map((i) => i.name)).toEqual([
      'Ärztekasse',
      'Miete',
      'Zeitung',
    ]);
  });

  it('verändert die Eingabeliste nicht', () => {
    const copy = [...items];
    sortRecurring(items, 'name', today);
    expect(items).toEqual(copy);
  });
});
