import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateLong,
  formatDaysFromToday,
  formatMonth,
  formatRelativeDay,
  fromISODate,
  todayISO,
} from './date';

describe('date helpers', () => {
  it('formatiert ISO-Daten als TT.MM.JJJJ', () => {
    expect(formatDate('2026-09-05')).toBe('05.09.2026');
    expect(formatDate('2024-02-29')).toBe('29.02.2024');
  });

  it('liefert leeren String für ungültige Daten', () => {
    expect(formatDate('kein-datum')).toBe('');
  });

  it('parst ISO-Daten in lokaler Zeit (kein Versatz um einen Tag)', () => {
    const d = fromISODate('2026-01-31');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(31);
  });

  it('erzeugt heutiges Datum in lokaler Zeit', () => {
    expect(todayISO(new Date(2026, 8, 25, 23, 59))).toBe('2026-09-25');
  });

  it('verwendet deutsche Monats- und Wochentagsnamen', () => {
    expect(formatMonth(new Date(2026, 2, 1))).toBe('März 2026');
    expect(formatDateLong('2026-09-25')).toBe('Freitag, 25. September');
  });
});

describe('formatRelativeDay', () => {
  it('zeigt Heute, Morgen oder das Datum', () => {
    expect(formatRelativeDay('2026-09-25', '2026-09-25')).toBe('Heute');
    expect(formatRelativeDay('2026-09-26', '2026-09-25')).toBe('Morgen');
    expect(formatRelativeDay('2026-10-01', '2026-09-30')).toBe('Morgen');
    expect(formatRelativeDay('2026-09-27', '2026-09-25')).toBe('27.09.2026');
  });
});

describe('formatDaysFromToday', () => {
  it.each([
    ['2026-09-25', 'heute'],
    ['2026-09-26', 'morgen'],
    ['2026-09-24', 'gestern'],
    ['2026-09-30', 'in 5 Tagen'],
    ['2026-09-20', 'vor 5 Tagen'],
    ['2027-09-25', 'in 365 Tagen'],
  ])('%s → %s', (iso, expected) => {
    expect(formatDaysFromToday(iso, '2026-09-25')).toBe(expected);
  });
});
