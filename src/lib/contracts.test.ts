import { describe, expect, it } from 'vitest';
import type { Contract, RecurringExpense } from '../types';
import {
  cancelledUntil,
  computeContractState,
  contractTimeline,
  lastCancellationDate,
  needsAttention,
  nthContractEnd,
  termEnd,
} from './contracts';

function contract(partial: Partial<Contract> = {}): Contract {
  return {
    startDate: '2025-01-01',
    minTermMonths: 24,
    renewalTermMonths: 12,
    noticePeriod: { value: 3, unit: 'months' },
    reminderLeadDays: 14,
    ...partial,
  };
}

describe('termEnd', () => {
  it.each([
    ['2026-01-01', 12, '2026-12-31'],
    ['2026-03-15', 1, '2026-04-14'],
    ['2026-01-28', 1, '2026-02-27'],
    // Fehlender Tag im Zielmonat → Monatsletzter
    ['2026-01-31', 1, '2026-02-28'],
    ['2026-01-30', 1, '2026-02-28'],
    ['2026-01-29', 1, '2026-02-28'],
    ['2026-03-31', 1, '2026-04-30'],
    // Schaltjahre
    ['2028-01-31', 1, '2028-02-29'],
    ['2028-01-29', 1, '2028-02-28'],
    ['2024-02-29', 12, '2025-02-28'],
    ['2024-02-29', 48, '2028-02-28'],
    ['2026-03-01', 12, '2027-02-28'],
    ['2027-03-01', 12, '2028-02-29'],
  ])('%s + %i Monate → %s', (start, months, expected) => {
    expect(termEnd(start, months)).toBe(expected);
  });
});

describe('lastCancellationDate', () => {
  it.each([
    ['2026-12-31', { value: 3, unit: 'months' }, '2026-09-30'],
    ['2026-06-30', { value: 3, unit: 'months' }, '2026-03-31'],
    ['2026-06-30', { value: 1, unit: 'months' }, '2026-05-31'],
    ['2027-02-28', { value: 1, unit: 'months' }, '2027-01-31'],
    ['2028-02-29', { value: 1, unit: 'months' }, '2028-01-31'],
    ['2026-04-14', { value: 1, unit: 'months' }, '2026-03-14'],
    ['2026-12-31', { value: 30, unit: 'days' }, '2026-12-01'],
    ['2026-12-31', { value: 2, unit: 'weeks' }, '2026-12-17'],
    ['2026-12-31', { value: 0, unit: 'months' }, '2026-12-31'],
  ] as const)('Ende %s, Frist %o → %s', (end, notice, expected) => {
    expect(lastCancellationDate(end, notice)).toBe(expected);
  });
});

describe('nthContractEnd', () => {
  it('rechnet Mindestlaufzeit und Verlängerungen vom Beginn aus', () => {
    const c = contract();
    expect(nthContractEnd(c, 0)).toBe('2026-12-31');
    expect(nthContractEnd(c, 1)).toBe('2027-12-31');
    expect(nthContractEnd(c, 2)).toBe('2028-12-31');
  });

  it('beginnt ohne Mindestlaufzeit direkt mit der Verlängerungsperiode', () => {
    const c = contract({ minTermMonths: 0, renewalTermMonths: 12, startDate: '2026-03-01' });
    expect(nthContractEnd(c, 0)).toBe('2027-02-28');
    expect(nthContractEnd(c, 1)).toBe('2028-02-29');
  });

  it('behält Monatsenden bei monatlicher Verlängerung ohne Wandern', () => {
    const c = contract({ minTermMonths: 0, renewalTermMonths: 0, startDate: '2026-01-31' });
    expect([0, 1, 2, 3].map((k) => nthContractEnd(c, k))).toEqual([
      '2026-02-28',
      '2026-03-30',
      '2026-04-30',
      '2026-05-30',
    ]);
  });
});

describe('computeContractState', () => {
  const c = contract(); // Ende 31.12.2026, Kündigungstermin 30.09.2026

  it.each([
    ['2026-09-10', 'ok', 20],
    ['2026-09-15', 'ok', 15],
    ['2026-09-16', 'bald', 14],
    ['2026-09-23', 'bald', 7],
    ['2026-09-24', 'dringend', 6],
    ['2026-09-30', 'dringend', 0],
  ] as const)('%s → %s (%i Tage)', (today, status, days) => {
    const state = computeContractState(c, today);
    expect(state.status).toBe(status);
    expect(state.daysLeft).toBe(days);
    expect(state.contractEnd).toBe('2026-12-31');
    expect(state.lastCancellationDate).toBe('2026-09-30');
  });

  it('berechnet das Erinnerungsdatum aus der Vorlaufzeit', () => {
    expect(computeContractState(c, '2026-01-01').reminderDate).toBe('2026-09-16');
    expect(computeContractState({ ...c, reminderLeadDays: 30 }, '2026-01-01').reminderDate).toBe(
      '2026-08-31',
    );
  });

  it('meldet „verpasst" bis zum Ende der laufenden Periode, mit nächster Möglichkeit', () => {
    for (const today of ['2026-10-01', '2026-12-31']) {
      const state = computeContractState(c, today);
      expect(state.status).toBe('verpasst');
      expect(state.contractEnd).toBe('2026-12-31');
      expect(state.lastCancellationDate).toBe('2026-09-30');
      expect(state.nextContractEnd).toBe('2027-12-31');
      expect(state.nextCancellationDate).toBe('2027-09-30');
      expect(state.reminderDate).toBe('2027-09-16');
    }
  });

  it('rechnet nach Ablauf der verpassten Periode mit der nächsten Frist', () => {
    const state = computeContractState(c, '2027-01-01');
    expect(state.status).toBe('ok');
    expect(state.contractEnd).toBe('2027-12-31');
    expect(state.lastCancellationDate).toBe('2027-09-30');
  });

  it('funktioniert mit weit zurückliegendem Vertragsbeginn', () => {
    const state = computeContractState(contract({ startDate: '2005-07-01' }), '2026-09-25');
    expect(state.contractEnd).toBe('2027-06-30');
    expect(state.lastCancellationDate).toBe('2027-03-31');
  });

  it('funktioniert mit Vertragsbeginn in der Zukunft', () => {
    const state = computeContractState(contract({ startDate: '2027-01-01' }), '2026-09-25');
    expect(state.status).toBe('ok');
    expect(state.contractEnd).toBe('2028-12-31');
  });

  it('kennt kein „verpasst" bei monatlich kündbaren Verträgen', () => {
    const monthly = contract({
      startDate: '2026-01-15',
      minTermMonths: 0,
      renewalTermMonths: 0,
      noticePeriod: { value: 1, unit: 'months' },
    });
    // Laufende Periode endet 14.10. (Frist 14.09. verpasst) → nächste: Ende 14.11., Frist 14.10.
    const state = computeContractState(monthly, '2026-09-25');
    expect(state.flexible).toBe(true);
    expect(state.status).toBe('ok');
    expect(state.contractEnd).toBe('2026-11-14');
    expect(state.lastCancellationDate).toBe('2026-10-14');
    expect(needsAttention(state)).toBe(false);
  });

  it('behandelt Mindestlaufzeit mit anschliessend monatlicher Kündbarkeit als flexibel', () => {
    const state = computeContractState(
      contract({ minTermMonths: 24, renewalTermMonths: 0 }),
      '2026-10-15',
    );
    // Mindestlaufzeit endet 31.12.2026, Frist 30.09. verpasst → nächstes Ende 31.01.2027
    expect(state.status).toBe('ok');
    expect(state.contractEnd).toBe('2027-01-31');
    expect(state.lastCancellationDate).toBe('2026-10-31');
  });

  it('meldet bei monatlich kündbaren Verträgen trotzdem „bald" und „dringend"', () => {
    const monthly = contract({
      startDate: '2026-01-01',
      minTermMonths: 0,
      renewalTermMonths: 0,
      noticePeriod: { value: 1, unit: 'months' },
    });
    const state = computeContractState(monthly, '2026-09-28');
    expect(state.lastCancellationDate).toBe('2026-09-30');
    expect(state.status).toBe('dringend');
    expect(needsAttention(state)).toBe(false);
  });

  describe('gekündigte Verträge', () => {
    it('läuft nach rechtzeitiger Kündigung bis zum Periodenende', () => {
      const cancelled = contract({ cancelledOn: '2026-09-20' });
      const state = computeContractState(cancelled, '2026-09-25');
      expect(state.status).toBe('gekuendigt');
      expect(state.contractEnd).toBe('2026-12-31');
      expect(state.reminderDate).toBeUndefined();
      expect(computeContractState(cancelled, '2026-12-31').status).toBe('gekuendigt');
      expect(computeContractState(cancelled, '2027-01-01').status).toBe('beendet');
    });

    it('verlängert sich bei zu später Kündigung um eine Periode', () => {
      const late = contract({ cancelledOn: '2026-10-01' });
      expect(computeContractState(late, '2026-10-05').contractEnd).toBe('2027-12-31');
    });

    it('akzeptiert eine Kündigung am letzten Tag der Frist', () => {
      const lastDay = contract({ cancelledOn: '2026-09-30' });
      expect(computeContractState(lastDay, '2026-10-05').contractEnd).toBe('2026-12-31');
    });

    it('meldet gekündigte Verträge nicht als dringend', () => {
      const state = computeContractState(contract({ cancelledOn: '2026-09-29' }), '2026-09-29');
      expect(needsAttention(state)).toBe(false);
    });
  });
});

describe('needsAttention', () => {
  it('zeigt bald, dringend und verpasst an, aber nicht ok', () => {
    const c = contract();
    expect(needsAttention(computeContractState(c, '2026-09-01'))).toBe(false);
    expect(needsAttention(computeContractState(c, '2026-09-20'))).toBe(true);
    expect(needsAttention(computeContractState(c, '2026-09-28'))).toBe(true);
    expect(needsAttention(computeContractState(c, '2026-10-02'))).toBe(true);
  });
});

function recurring(name: string, c?: Contract): RecurringExpense {
  return {
    id: name,
    name,
    amount: 1000,
    interval: 'monthly',
    nextDueDate: '2026-10-01',
    categoryId: 'fix-abos',
    active: true,
    contract: c,
  };
}

describe('contractTimeline', () => {
  it('filtert Posten ohne Vertrag und sortiert nach letztem Kündigungstermin', () => {
    const entries = contractTimeline(
      [
        recurring('Ohne Vertrag'),
        recurring('Gekündigt', contract({ cancelledOn: '2026-01-10' })),
        recurring('Später', contract({ startDate: '2025-06-01' })), // Frist 28.02.2027
        recurring('Verpasst', contract({ startDate: '2024-11-01' })), // Ende 31.10.2026, Frist 31.07. vorbei
        recurring('Bald', contract()), // Frist 30.09.2026
      ],
      '2026-09-20',
    );
    expect(entries.map((e) => `${e.expense.name}:${e.state.status}`)).toEqual([
      'Verpasst:verpasst',
      'Bald:bald',
      'Später:ok',
      'Gekündigt:gekuendigt',
    ]);
  });
});

describe('cancelledUntil', () => {
  it('liefert das Vertragsende gekündigter Verträge', () => {
    expect(cancelledUntil(recurring('A', contract({ cancelledOn: '2026-09-01' })))).toBe(
      '2026-12-31',
    );
    expect(cancelledUntil(recurring('B', contract()))).toBeUndefined();
    expect(cancelledUntil(recurring('C'))).toBeUndefined();
  });
});
