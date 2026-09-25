import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../test/utils';
import type { Contract, RecurringExpense } from '../types';
import { db } from './db';
import { deactivateEndedContracts } from './maintenance';

const baseContract: Contract = {
  startDate: '2025-01-01',
  minTermMonths: 12,
  renewalTermMonths: 12,
  noticePeriod: { value: 1, unit: 'months' },
  reminderLeadDays: 14,
};

function item(id: string, contract?: Contract): RecurringExpense {
  return {
    id,
    name: id,
    amount: 1000,
    interval: 'monthly',
    nextDueDate: '2026-01-01',
    categoryId: 'fix-abos',
    active: true,
    contract,
  };
}

beforeEach(resetDb);

describe('deactivateEndedContracts', () => {
  it('deaktiviert nur gekündigte Verträge nach Vertragsende', async () => {
    await db.recurringExpenses.bulkAdd([
      item('beendet', { ...baseContract, cancelledOn: '2025-10-01' }), // Ende 31.12.2025
      item('laeuft-noch', { ...baseContract, cancelledOn: '2026-11-01' }), // Ende 31.12.2026
      item('nicht-gekuendigt', baseContract),
      item('ohne-vertrag'),
    ]);
    expect(await deactivateEndedContracts('2026-09-25')).toBe(1);
    const active = Object.fromEntries(
      (await db.recurringExpenses.toArray()).map((r) => [r.id, r.active]),
    );
    expect(active).toEqual({
      beendet: false,
      'laeuft-noch': true,
      'nicht-gekuendigt': true,
      'ohne-vertrag': true,
    });
  });
});
