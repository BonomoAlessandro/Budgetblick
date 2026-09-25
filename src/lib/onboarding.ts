import type { Interval } from '../types';

export interface FixedCostSuggestion {
  name: string;
  categoryId: string;
  interval: Interval;
  /** Vorschlagsbetrag in Rappen, nur wo der Betrag schweizweit einheitlich ist */
  amount?: number;
}

/** Typische Schweizer Fixkosten für den Einrichtungs-Assistenten. */
export const FIXED_COST_SUGGESTIONS: FixedCostSuggestion[] = [
  { name: 'Miete', categoryId: 'fix-wohnen', interval: 'monthly' },
  { name: 'Nebenkosten', categoryId: 'fix-wohnen', interval: 'monthly' },
  { name: 'Krankenkasse Grundversicherung', categoryId: 'fix-krankenkasse', interval: 'monthly' },
  { name: 'Krankenkasse Zusatzversicherung', categoryId: 'fix-krankenkasse', interval: 'monthly' },
  {
    name: 'Hausrat- & Haftpflichtversicherung',
    categoryId: 'fix-wohnen',
    interval: 'yearly',
  },
  { name: 'Autoversicherung', categoryId: 'fix-mobilitaet', interval: 'yearly' },
  { name: 'Handy-Abo', categoryId: 'fix-telefon', interval: 'monthly' },
  { name: 'Internet & TV', categoryId: 'fix-telefon', interval: 'monthly' },
  { name: 'Serafe', categoryId: 'fix-serafe', interval: 'yearly', amount: 33500 },
  { name: 'GA', categoryId: 'fix-mobilitaet', interval: 'yearly' },
  { name: 'Halbtax', categoryId: 'fix-mobilitaet', interval: 'yearly' },
  { name: 'Streaming', categoryId: 'fix-abos', interval: 'monthly' },
  { name: 'Steuern (Raten)', categoryId: 'fix-steuern', interval: 'monthly' },
];

export const SETTING_ONBOARDING_DONE = 'onboardingDone';
/** Gesetzt, solange der Assistent läuft (damit er nach dem ersten Speichern nicht verschwindet). */
export const SETTING_ONBOARDING_IN_PROGRESS = 'onboardingInProgress';
