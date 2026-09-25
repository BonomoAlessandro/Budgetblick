import { describe, expect, it } from 'vitest';
import {
  contractReminderIcs,
  createIcsEvent,
  escapeIcsText,
  foldIcsLine,
  icsFileName,
} from './ics';

const NOW = new Date(Date.UTC(2026, 8, 25, 8, 30, 0));

describe('escapeIcsText', () => {
  it('maskiert Sonderzeichen', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
});

describe('foldIcsLine', () => {
  it('lässt kurze Zeilen unverändert', () => {
    expect(foldIcsLine('SUMMARY:kurz')).toBe('SUMMARY:kurz');
  });

  it('faltet lange Zeilen auf 75 Oktette, auch mit Umlauten', () => {
    const line = `DESCRIPTION:${'ä'.repeat(100)}`;
    const folded = foldIcsLine(line);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(' '))).toBe(true);
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(line);
  });
});

describe('createIcsEvent', () => {
  it('erzeugt einen ganztägigen Termin mit Erinnerung und CRLF-Zeilenenden', () => {
    const ics = createIcsEvent(
      { uid: 'x@budgetblick', date: '2026-12-31', summary: 'Test, mit Komma' },
      NOW,
    );
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
    expect(ics).toContain('DTSTAMP:20260925T083000Z\r\n');
    expect(ics).toContain('SUMMARY:Test\\, mit Komma\r\n');
    expect(ics).toContain('TRIGGER:PT9H\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });
});

describe('contractReminderIcs', () => {
  const input = {
    expenseId: 'abc',
    name: 'Handy-Abo',
    provider: 'Swisscom',
    reminderDate: '2026-09-16',
    cancellationDate: '2026-09-30',
    contractEnd: '2026-12-31',
  };

  it('legt den Termin auf das Erinnerungsdatum', () => {
    const ics = contractReminderIcs(input, '2026-09-01', NOW);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260916');
    expect(ics).toContain('SUMMARY:Kündigungsfrist: Handy-Abo (Swisscom)');
    expect(ics).toContain('Letzter Kündigungstermin: 30.09.2026');
    expect(ics).toContain('UID:abc-2026-09-30@budgetblick');
  });

  it('verwendet heute, wenn das Erinnerungsdatum vorbei ist', () => {
    expect(contractReminderIcs(input, '2026-09-25', NOW)).toContain('DTSTART;VALUE=DATE:20260925');
  });
});

describe('icsFileName', () => {
  it('erzeugt sichere Dateinamen', () => {
    expect(icsFileName('Krankenkasse Zusatz (Sanitas)')).toBe(
      'kuendigung-krankenkasse-zusatz-sanitas.ics',
    );
    expect(icsFileName('Fitnessstudio Zürich')).toBe('kuendigung-fitnessstudio-zuerich.ics');
    expect(icsFileName('!!!')).toBe('kuendigung-vertrag.ics');
  });
});
