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
  // Variabel
  { id: 'var-lebensmittel', name: 'Lebensmittel', icon: '🛒', color: '#16a34a', kind: 'variable' },
  {
    id: 'var-restaurant',
    name: 'Restaurant & Café',
    icon: '☕',
    color: '#ea580c',
    kind: 'variable',
  },
  { id: 'var-freizeit', name: 'Freizeit', icon: '🎟️', color: '#9333ea', kind: 'variable' },
  { id: 'var-shopping', name: 'Shopping', icon: '🛍️', color: '#e11d48', kind: 'variable' },
  { id: 'var-gesundheit', name: 'Gesundheit', icon: '💊', color: '#0d9488', kind: 'variable' },
  { id: 'var-transport', name: 'Transport', icon: '🚲', color: '#4f46e5', kind: 'variable' },
  { id: 'var-geschenke', name: 'Geschenke', icon: '🎁', color: '#c026d3', kind: 'variable' },
  { id: 'var-sonstiges', name: 'Sonstiges', icon: '📦', color: '#64748b', kind: 'variable' },
];

/** ID der Standardkategorie „Krankenkasse" (für den Wechsel-Hinweis). */
export const HEALTH_INSURANCE_CATEGORY_ID = 'fix-krankenkasse';
