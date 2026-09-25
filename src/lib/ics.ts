import { addDays } from 'date-fns';
import { formatDate, fromISODate, toISODate } from './date';

export interface IcsReminder {
  uid: string;
  /** ISO-Datum des ganztägigen Termins */
  date: string;
  summary: string;
  description?: string;
  /** Erinnerung um diese Uhrzeit am Termintag (Stunden, Standard 9) */
  alarmHour?: number;
}

/** Maskiert Text gemäss RFC 5545 (Backslash, Semikolon, Komma, Zeilenumbruch). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Faltet Zeilen auf max. 75 Oktette (UTF-8), Folgezeilen beginnen mit einem Leerzeichen. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // Folgezeilen: 1 Oktett für das Leerzeichen
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function icsDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function icsTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Erzeugt eine .ics-Datei mit einem ganztägigen Termin und einer Erinnerung. */
export function createIcsEvent(reminder: IcsReminder, now: Date = new Date()): string {
  const alarmHour = reminder.alarmHour ?? 9;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Budgetblick//Vertragsfristen//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reminder.uid}`,
    `DTSTAMP:${icsTimestamp(now)}`,
    `DTSTART;VALUE=DATE:${icsDate(reminder.date)}`,
    `DTEND;VALUE=DATE:${icsDate(toISODate(addDays(fromISODate(reminder.date), 1)))}`,
    `SUMMARY:${escapeIcsText(reminder.summary)}`,
    ...(reminder.description ? [`DESCRIPTION:${escapeIcsText(reminder.description)}`] : []),
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(reminder.summary)}`,
    `TRIGGER:PT${alarmHour}H`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export interface ContractReminderInput {
  expenseId: string;
  name: string;
  provider?: string;
  reminderDate: string;
  cancellationDate: string;
  contractEnd: string;
}

/**
 * Termin für die Kündigungserinnerung. Liegt das Erinnerungsdatum bereits in der
 * Vergangenheit, wird der Termin auf heute gelegt.
 */
export function contractReminderIcs(input: ContractReminderInput, todayISO: string, now?: Date) {
  const date = input.reminderDate < todayISO ? todayISO : input.reminderDate;
  const who = input.provider ? `${input.name} (${input.provider})` : input.name;
  return createIcsEvent(
    {
      uid: `${input.expenseId}-${input.cancellationDate}@budgetblick`,
      date,
      summary: `Kündigungsfrist: ${who}`,
      description:
        `Letzter Kündigungstermin: ${formatDate(input.cancellationDate)}\n` +
        `Vertragsende: ${formatDate(input.contractEnd)}\n` +
        'Die Kündigung muss bis zum Kündigungstermin beim Anbieter eingegangen sein.',
    },
    now,
  );
}

/** Dateiname ohne problematische Zeichen, z. B. "kuendigung-swisscom.ics". */
export function icsFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `kuendigung-${slug || 'vertrag'}.ics`;
}
