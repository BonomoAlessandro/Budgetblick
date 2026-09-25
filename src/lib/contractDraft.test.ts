import { describe, expect, it } from 'vitest';
import { parseContractDraft, toContractDraft } from './contractDraft';

describe('contractDraft', () => {
  it('liefert sinnvolle Standardwerte', () => {
    expect(toContractDraft(undefined, '2026-09-25', 21)).toEqual({
      provider: '',
      startDate: '2026-09-25',
      minTermMonths: '12',
      renewalTermMonths: '12',
      noticeValue: '3',
      noticeUnit: 'months',
      reminderLeadDays: '21',
      cancelledOn: '',
    });
  });

  it('wandelt hin und zurück ohne Verlust', () => {
    const contract = {
      provider: 'Sunrise',
      startDate: '2025-02-01',
      minTermMonths: 24,
      renewalTermMonths: 0,
      noticePeriod: { value: 60, unit: 'days' as const },
      reminderLeadDays: 10,
      cancelledOn: '2026-01-15',
    };
    expect(parseContractDraft(toContractDraft(contract, '2026-09-25')).contract).toEqual(contract);
  });

  it('entfernt leere optionale Felder', () => {
    const { contract } = parseContractDraft(toContractDraft(undefined, '2026-09-25'));
    expect(contract).toBeDefined();
    expect('provider' in contract! && contract.provider).toBeFalsy();
    expect(contract!.cancelledOn).toBeUndefined();
  });

  it('meldet ungültige Eingaben', () => {
    const draft = {
      ...toContractDraft(undefined, '2026-09-25'),
      startDate: '',
      minTermMonths: '1.5',
      noticeValue: '-1',
      reminderLeadDays: '400',
    };
    const { contract, errors } = parseContractDraft(draft);
    expect(contract).toBeUndefined();
    expect(Object.keys(errors).sort()).toEqual([
      'minTermMonths',
      'noticeValue',
      'reminderLeadDays',
      'startDate',
    ]);
  });

  it('lehnt eine Kündigung vor Vertragsbeginn ab', () => {
    const { errors } = parseContractDraft({
      ...toContractDraft(undefined, '2026-09-25'),
      cancelledOn: '2026-01-01',
    });
    expect(errors.cancelledOn).toMatch(/vor Vertragsbeginn/);
  });
});
