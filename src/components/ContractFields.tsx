import { computeContractState, CONTRACT_STATUS_LABELS } from '../lib/contracts';
import {
  NOTICE_UNIT_LABELS,
  parseContractDraft,
  type ContractDraft,
  type ContractDraftErrors,
} from '../lib/contractDraft';
import { formatDate, todayISO } from '../lib/date';
import type { NoticePeriod } from '../types';
import { Field } from './fields';
import { inputClass } from './styles';

const RENEWAL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Monatlich kündbar' },
  { value: 1, label: 'um 1 Monat' },
  { value: 3, label: 'um 3 Monate' },
  { value: 6, label: 'um 6 Monate' },
  { value: 12, label: 'um 12 Monate' },
  { value: 24, label: 'um 24 Monate' },
];

interface ContractFieldsProps {
  draft: ContractDraft;
  errors: ContractDraftErrors;
  onChange: (draft: ContractDraft) => void;
}

/** Eingabefelder für Laufzeit und Kündigungsfrist inkl. Live-Vorschau der Frist. */
export function ContractFields({ draft, errors, onChange }: ContractFieldsProps) {
  const set = <K extends keyof ContractDraft>(key: K, value: ContractDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const renewalOptions = RENEWAL_OPTIONS.some((o) => String(o.value) === draft.renewalTermMonths)
    ? RENEWAL_OPTIONS
    : [
        ...RENEWAL_OPTIONS,
        { value: Number(draft.renewalTermMonths), label: `um ${draft.renewalTermMonths} Monate` },
      ];

  const { contract } = parseContractDraft(draft);
  const preview = contract ? computeContractState(contract, todayISO()) : undefined;

  return (
    <div className="space-y-3">
      <Field label="Anbieter">
        {(p) => (
          <input
            {...p}
            className={inputClass}
            placeholder="z. B. Swisscom"
            value={draft.provider}
            onChange={(e) => set('provider', e.target.value)}
            autoComplete="off"
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vertragsbeginn" error={errors.startDate}>
          {(p) => (
            <input
              {...p}
              type="date"
              className={inputClass}
              value={draft.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          )}
        </Field>
        <Field label="Mindestlaufzeit (Monate)" error={errors.minTermMonths}>
          {(p) => (
            <input
              {...p}
              inputMode="numeric"
              className={inputClass}
              value={draft.minTermMonths}
              onChange={(e) => set('minTermMonths', e.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Danach verlängert sich der Vertrag" error={errors.renewalTermMonths}>
        {(p) => (
          <select
            {...p}
            className={inputClass}
            value={draft.renewalTermMonths}
            onChange={(e) => set('renewalTermMonths', e.target.value)}
          >
            {renewalOptions.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kündigungsfrist" error={errors.noticeValue}>
          {(p) => (
            <input
              {...p}
              inputMode="numeric"
              className={inputClass}
              value={draft.noticeValue}
              onChange={(e) => set('noticeValue', e.target.value)}
            />
          )}
        </Field>
        <Field label="Einheit">
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={draft.noticeUnit}
              onChange={(e) => set('noticeUnit', e.target.value as NoticePeriod['unit'])}
            >
              {Object.entries(NOTICE_UNIT_LABELS).map(([unit, label]) => (
                <option key={unit} value={unit}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Erinnerung (Tage vorher)" error={errors.reminderLeadDays}>
          {(p) => (
            <input
              {...p}
              inputMode="numeric"
              className={inputClass}
              value={draft.reminderLeadDays}
              onChange={(e) => set('reminderLeadDays', e.target.value)}
            />
          )}
        </Field>
        <Field label="Gekündigt am" error={errors.cancelledOn}>
          {(p) => (
            <input
              {...p}
              type="date"
              className={inputClass}
              value={draft.cancelledOn}
              onChange={(e) => set('cancelledOn', e.target.value)}
            />
          )}
        </Field>
      </div>
      {preview && (
        <p
          className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          data-testid="contract-preview"
        >
          {preview.status === 'gekuendigt' || preview.status === 'beendet' ? (
            <>
              {CONTRACT_STATUS_LABELS[preview.status]} · Vertragsende{' '}
              <strong>{formatDate(preview.contractEnd)}</strong>
            </>
          ) : (
            <>
              Kündigen bis <strong>{formatDate(preview.nextCancellationDate!)}</strong> auf
              Vertragsende {formatDate(preview.nextContractEnd!)}
            </>
          )}
        </p>
      )}
    </div>
  );
}
