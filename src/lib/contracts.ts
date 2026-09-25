import { addDays, addMonths, differenceInCalendarDays, subDays, subMonths } from 'date-fns';
import type { Contract, NoticePeriod, RecurringExpense } from '../types';
import { fromISODate, toISODate } from './date';

export const DEFAULT_REMINDER_LEAD_DAYS = 14;
/** Weniger als so viele Tage bis zum Kündigungstermin gilt als „dringend". */
export const URGENT_DAYS = 7;

export type ContractStatus = 'ok' | 'bald' | 'dringend' | 'verpasst' | 'gekuendigt' | 'beendet';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ok: 'OK',
  bald: 'Bald',
  dringend: 'Dringend',
  verpasst: 'Verpasst',
  gekuendigt: 'Gekündigt',
  beendet: 'Beendet',
};

/** Laufzeit einer Verlängerungsperiode in Monaten (0 = monatlich kündbar → 1). */
function renewalStep(contract: Contract): number {
  return contract.renewalTermMonths > 0 ? contract.renewalTermMonths : 1;
}

/**
 * Ende einer Laufzeit von `months` Monaten ab `startISO` (letzter Vertragstag).
 * Beispiel: Beginn 01.01.2026, 12 Monate → 31.12.2026.
 * Fehlt der entsprechende Tag im Zielmonat (31.01. + 1 Monat), endet die Laufzeit
 * am Monatsletzten (28./29.02.), analog OR Art. 77.
 */
export function termEnd(startISO: string, months: number): string {
  const start = fromISODate(startISO);
  const target = addMonths(start, months);
  const clamped = target.getDate() !== start.getDate();
  return toISODate(clamped ? target : subDays(target, 1));
}

/** Ende der k-ten Laufzeit (k = 0: Mindestlaufzeit bzw. erste Periode). */
export function nthContractEnd(contract: Contract, k: number): string {
  const step = renewalStep(contract);
  const first = contract.minTermMonths > 0 ? contract.minTermMonths : step;
  return termEnd(contract.startDate, first + k * step);
}

/**
 * Letzter Tag, an dem die Kündigung beim Anbieter eingegangen sein muss.
 * Die Frist läuft rückwärts ab dem Tag nach Vertragsende:
 * Ende 30.06., 3 Monate → Frist beginnt 01.04. → letzter Termin 31.03.
 */
export function lastCancellationDate(contractEndISO: string, notice: NoticePeriod): string {
  const end = fromISODate(contractEndISO);
  switch (notice.unit) {
    case 'days':
      return toISODate(subDays(end, notice.value));
    case 'weeks':
      return toISODate(subDays(end, notice.value * 7));
    case 'months':
      return toISODate(subDays(subMonths(addDays(end, 1), notice.value), 1));
  }
}

/** Index der ersten Laufzeit, die am oder nach `fromISO` endet. */
function indexOfTermEndingFrom(contract: Contract, fromISO: string): number {
  let k = 0;
  while (nthContractEnd(contract, k) < fromISO) k += 1;
  return k;
}

/** Index der ersten Laufzeit, deren Kündigungstermin am oder nach `fromISO` liegt. */
function indexOfReachableTerm(contract: Contract, fromISO: string, startIndex = 0): number {
  let k = startIndex;
  while (lastCancellationDate(nthContractEnd(contract, k), contract.noticePeriod) < fromISO) {
    k += 1;
  }
  return k;
}

export interface ContractState {
  status: ContractStatus;
  /**
   * Massgebliches Vertragsende: bei „verpasst" das Ende der laufenden Periode
   * (der Vertrag verlängert sich danach), bei gekündigten Verträgen das Ende durch
   * die Kündigung, sonst das nächste erreichbare Vertragsende.
   */
  contractEnd: string;
  /** Letzter Kündigungstermin für `contractEnd` */
  lastCancellationDate: string;
  /** Nächste Kündigungsmöglichkeit (bei „verpasst" die folgende Periode, sonst wie oben) */
  nextCancellationDate?: string;
  nextContractEnd?: string;
  /** Tage bis zur nächsten Kündigungsmöglichkeit */
  daysLeft?: number;
  /** Datum der Erinnerung (Kündigungstermin − Vorlaufzeit) */
  reminderDate?: string;
  /** Monatlich kündbar: eine verpasste Frist verschiebt das Ende nur um einen Monat */
  flexible: boolean;
}

function statusForDays(daysLeft: number, leadDays: number): ContractStatus {
  if (daysLeft < URGENT_DAYS) return 'dringend';
  if (daysLeft <= leadDays) return 'bald';
  return 'ok';
}

/**
 * Berechnet Vertragsende, letzten Kündigungstermin und Status zum Stichtag `todayISO`.
 *
 * - „verpasst": Die Frist für die laufende Periode ist vorbei, der Vertrag verlängert
 *   sich. Bleibt bis zum Ende der laufenden Periode bestehen, danach gilt die nächste Frist.
 *   Bei monatlich kündbaren Verträgen gibt es kein „verpasst" – es zählt einfach die
 *   nächste Möglichkeit.
 * - „gekündigt": Kündigung erfasst, Vertrag läuft bis `contractEnd`; danach „beendet".
 */
export function computeContractState(contract: Contract, todayISO: string): ContractState {
  const flexible = contract.renewalTermMonths <= 1;

  if (contract.cancelledOn) {
    // Erste Laufzeit, deren Kündigungstermin die Kündigung noch rechtzeitig erreicht hat.
    const k = indexOfReachableTerm(contract, contract.cancelledOn);
    const end = nthContractEnd(contract, k);
    return {
      status: todayISO > end ? 'beendet' : 'gekuendigt',
      contractEnd: end,
      lastCancellationDate: lastCancellationDate(end, contract.noticePeriod),
      flexible,
    };
  }

  const current = indexOfTermEndingFrom(contract, todayISO);
  const reachable = indexOfReachableTerm(contract, todayISO, current);
  const reachableEnd = nthContractEnd(contract, reachable);
  const reachableDeadline = lastCancellationDate(reachableEnd, contract.noticePeriod);
  const daysLeft = differenceInCalendarDays(fromISODate(reachableDeadline), fromISODate(todayISO));
  const reminderDate = toISODate(
    subDays(fromISODate(reachableDeadline), contract.reminderLeadDays),
  );

  if (reachable > current && !flexible) {
    const currentEnd = nthContractEnd(contract, current);
    return {
      status: 'verpasst',
      contractEnd: currentEnd,
      lastCancellationDate: lastCancellationDate(currentEnd, contract.noticePeriod),
      nextContractEnd: reachableEnd,
      nextCancellationDate: reachableDeadline,
      daysLeft,
      reminderDate,
      flexible,
    };
  }

  return {
    status: statusForDays(daysLeft, contract.reminderLeadDays),
    contractEnd: reachableEnd,
    lastCancellationDate: reachableDeadline,
    nextContractEnd: reachableEnd,
    nextCancellationDate: reachableDeadline,
    daysLeft,
    reminderDate,
    flexible,
  };
}

/** Status, die im Dashboard unter „Fristen" erscheinen. */
export function needsAttention(state: ContractState): boolean {
  if (state.status === 'verpasst') return true;
  // Monatlich kündbare Verträge hätten jeden Monat eine Frist – das wäre nur Rauschen.
  return !state.flexible && (state.status === 'bald' || state.status === 'dringend');
}

export interface ContractEntry {
  expense: RecurringExpense & { contract: Contract };
  state: ContractState;
}

const STATUS_ORDER: Record<ContractStatus, number> = {
  verpasst: 0,
  dringend: 0,
  bald: 0,
  ok: 0,
  gekuendigt: 1,
  beendet: 2,
};

/**
 * Alle Fixkosten mit Vertragsdetails samt Status, sortiert nach letztem Kündigungstermin
 * (verpasste Termine liegen in der Vergangenheit und stehen daher oben).
 * Gekündigte und beendete Verträge folgen am Schluss.
 */
export function contractTimeline(recurring: RecurringExpense[], todayISO: string): ContractEntry[] {
  return recurring
    .filter((r): r is RecurringExpense & { contract: Contract } => r.contract !== undefined)
    .map((expense) => ({ expense, state: computeContractState(expense.contract, todayISO) }))
    .sort((a, b) => {
      const byGroup = STATUS_ORDER[a.state.status] - STATUS_ORDER[b.state.status];
      if (byGroup !== 0) return byGroup;
      return (
        a.state.lastCancellationDate.localeCompare(b.state.lastCancellationDate) ||
        a.expense.name.localeCompare(b.expense.name, 'de')
      );
    });
}

/**
 * Letzter Tag, an dem eine gekündigte Fixkosten-Position noch abgebucht wird
 * (Vertragsende), sonst `undefined`.
 */
export function cancelledUntil(expense: RecurringExpense): string | undefined {
  if (!expense.contract?.cancelledOn) return undefined;
  return computeContractState(expense.contract, expense.contract.cancelledOn).contractEnd;
}
