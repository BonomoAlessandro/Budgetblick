import { format, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

/** Date → ISO-Datum `YYYY-MM-DD` (lokale Zeitzone). */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Heutiges Datum als ISO-Datum (lokale Zeitzone). */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** ISO-Datum als lokales Date (ohne UTC-Verschiebung). */
export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

/** Formatiert ein ISO-Datum als TT.MM.JJJJ. */
export function formatDate(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd.MM.yyyy') : '';
}

/** Formatiert ein ISO-Datum lang, z. B. "Freitag, 25. September". */
export function formatDateLong(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'EEEE, d. MMMM', { locale: de }) : '';
}

/** Monatsname mit Jahr, z. B. "September 2026". */
export function formatMonth(date: Date): string {
  return format(date, 'LLLL yyyy', { locale: de });
}
