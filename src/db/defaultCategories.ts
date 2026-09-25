import type { Category } from '../types';

/** Standardkategorien beim ersten Start. Feste IDs, damit Import/Export stabil bleibt. */
export const DEFAULT_CATEGORIES: Category[] = [
  // Fixkosten
  { id: 'fix-wohnen', name: 'Wohnen', icon: '🏠', color: '#0f766e', kind: 'fixed' },
  { id: 'fix-krankenkasse', name: 'Krankenkasse', icon: '🩺', color: '#dc2626', kind: 'fixed' },
  { id: 'fix-versicherungen', name: 'Versicherungen', icon: '🛡️', color: '#2563eb', kind: 'fixed' },
  { id: 'fix-mobilitaet', name: 'Mobilität', icon: '🚆', color: '#7c3aed', kind: 'fixed' },
  { id: 'fix-telefon', name: 'Telefon & Internet', icon: '📱', color: '#0891b2', kind: 'fixed' },
  { id: 'fix-abos', name: 'Abos & Streaming', icon: '📺', color: '#db2777', kind: 'fixed' },
  { id: 'fix-serafe', name: 'Serafe & Gebühren', icon: '📻', color: '#ca8a04', kind: 'fixed' },
  { id: 'fix-steuern', name: 'Steuern', icon: '🏛️', color: '#475569', kind: 'fixed' },
  // Variabel – Farben in dieser Reihenfolge sind auf Farbenblind-Tauglichkeit geprüft
  // (benachbarte Paare im Donut-Diagramm), daher Reihenfolge beibehalten.
  { id: 'var-lebensmittel', name: 'Lebensmittel', icon: '🛒', color: '#2a78d6', kind: 'variable' },
  {
    id: 'var-restaurant',
    name: 'Restaurant & Café',
    icon: '☕',
    color: '#eb6834',
    kind: 'variable',
  },
  { id: 'var-freizeit', name: 'Freizeit', icon: '🎟️', color: '#1baf7a', kind: 'variable' },
  { id: 'var-shopping', name: 'Shopping', icon: '🛍️', color: '#eda100', kind: 'variable' },
  { id: 'var-gesundheit', name: 'Gesundheit', icon: '💊', color: '#e87ba4', kind: 'variable' },
  { id: 'var-transport', name: 'Transport', icon: '🚲', color: '#008300', kind: 'variable' },
  { id: 'var-geschenke', name: 'Geschenke', icon: '🎁', color: '#4a3aa7', kind: 'variable' },
  { id: 'var-sonstiges', name: 'Sonstiges', icon: '📦', color: '#e34948', kind: 'variable' },
];

/** ID der Standardkategorie „Krankenkasse" (für den Wechsel-Hinweis). */
export const HEALTH_INSURANCE_CATEGORY_ID = 'fix-krankenkasse';
