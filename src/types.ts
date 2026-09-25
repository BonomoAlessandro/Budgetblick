/**
 * Datenmodell. Alle Beträge (`amount`) sind in Rappen (Integer) gespeichert,
 * alle Datumsfelder als ISO-Datum `YYYY-MM-DD`.
 */

export type Interval = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly';

export type CategoryKind = 'fixed' | 'variable';

export interface Category {
  id: string;
  name: string;
  /** Emoji */
  icon: string;
  /** Hex-Farbe, z. B. "#0f766e" */
  color: string;
  kind: CategoryKind;
}

export interface Income {
  id: string;
  name: string;
  /** Rappen */
  amount: number;
  interval: Interval;
}

export interface NoticePeriod {
  value: number;
  unit: 'days' | 'weeks' | 'months';
}

export interface Contract {
  provider?: string;
  startDate: string;
  /** Mindestlaufzeit in Monaten, 0 = keine */
  minTermMonths: number;
  /** Automatische Verlängerung in Monaten, 0 = monatlich kündbar */
  renewalTermMonths: number;
  noticePeriod: NoticePeriod;
  /** Falls bereits gekündigt: Datum der Kündigung */
  cancelledOn?: string;
  /** Standard: 14 */
  reminderLeadDays: number;
}

export interface RecurringExpense {
  id: string;
  name: string;
  /** Rappen */
  amount: number;
  interval: Interval;
  nextDueDate: string;
  categoryId: string;
  active: boolean;
  notes?: string;
  contract?: Contract;
}

export type ExpenseSource = 'manual' | 'scan';

export interface Expense {
  id: string;
  /** Rappen */
  amount: number;
  date: string;
  categoryId: string;
  merchant?: string;
  note?: string;
  receiptImage?: Blob;
  source: ExpenseSource;
  /** Zeitpunkt der Erfassung (ms), für die Reihenfolge innerhalb eines Tages */
  createdAt?: number;
}

export interface Setting<T = unknown> {
  key: string;
  value: T;
}
