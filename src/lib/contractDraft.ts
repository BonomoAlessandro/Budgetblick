import type { Contract, NoticePeriod } from '../types';
import { DEFAULT_REMINDER_LEAD_DAYS } from './contracts';

/** Formularwerte für Vertragsdetails (alles als Text, wie im Eingabefeld). */
export interface ContractDraft {
  provider: string;
  startDate: string;
  minTermMonths: string;
  renewalTermMonths: string;
  noticeValue: string;
  noticeUnit: NoticePeriod['unit'];
  reminderLeadDays: string;
  cancelledOn: string;
}

export type ContractDraftErrors = Partial<Record<keyof ContractDraft, string>>;

export const NOTICE_UNIT_LABELS: Record<NoticePeriod['unit'], string> = {
  days: 'Tage',
  weeks: 'Wochen',
  months: 'Monate',
};

export function toContractDraft(
  contract: Contract | undefined,
  todayISO: string,
  defaultLeadDays = DEFAULT_REMINDER_LEAD_DAYS,
): ContractDraft {
  return {
    provider: contract?.provider ?? '',
    startDate: contract?.startDate ?? todayISO,
    minTermMonths: String(contract?.minTermMonths ?? 12),
    renewalTermMonths: String(contract?.renewalTermMonths ?? 12),
    noticeValue: String(contract?.noticePeriod.value ?? 3),
    noticeUnit: contract?.noticePeriod.unit ?? 'months',
    reminderLeadDays: String(contract?.reminderLeadDays ?? defaultLeadDays),
    cancelledOn: contract?.cancelledOn ?? '',
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseCount(value: string, max: number): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n <= max ? n : null;
}

/** Prüft die Formularwerte und wandelt sie in einen Vertrag um. */
export function parseContractDraft(draft: ContractDraft): {
  contract?: Contract;
  errors: ContractDraftErrors;
} {
  const errors: ContractDraftErrors = {};
  const minTerm = parseCount(draft.minTermMonths, 240);
  const renewal = parseCount(draft.renewalTermMonths, 240);
  const notice = parseCount(draft.noticeValue, 999);
  const lead = parseCount(draft.reminderLeadDays, 365);

  if (!ISO_DATE.test(draft.startDate)) errors.startDate = 'Bitte ein gültiges Datum wählen.';
  if (minTerm === null) errors.minTermMonths = 'Ganze Zahl, 0 = keine Mindestlaufzeit.';
  if (renewal === null) errors.renewalTermMonths = 'Bitte eine Verlängerung wählen.';
  if (notice === null) errors.noticeValue = 'Ganze Zahl, z. B. 3.';
  if (lead === null) errors.reminderLeadDays = 'Ganze Zahl zwischen 0 und 365.';
  if (draft.cancelledOn && !ISO_DATE.test(draft.cancelledOn)) {
    errors.cancelledOn = 'Bitte ein gültiges Datum wählen.';
  }
  if (draft.cancelledOn && ISO_DATE.test(draft.startDate) && draft.cancelledOn < draft.startDate) {
    errors.cancelledOn = 'Die Kündigung kann nicht vor Vertragsbeginn liegen.';
  }

  if (
    Object.keys(errors).length > 0 ||
    minTerm === null ||
    renewal === null ||
    notice === null ||
    lead === null
  ) {
    return { errors };
  }

  return {
    errors,
    contract: {
      provider: draft.provider.trim() || undefined,
      startDate: draft.startDate,
      minTermMonths: minTerm,
      renewalTermMonths: renewal,
      noticePeriod: { value: notice, unit: draft.noticeUnit },
      reminderLeadDays: lead,
      cancelledOn: draft.cancelledOn || undefined,
    },
  };
}
