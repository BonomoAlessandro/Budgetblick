import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
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

/** „Heute", „Morgen" oder TT.MM.JJJJ. */
export function formatRelativeDay(iso: string, todayIso: string): string {
  if (iso === todayIso) return 'Heute';
  if (iso === toISODate(addDays(parseISO(todayIso), 1))) return 'Morgen';
  return formatDate(iso);
}

/** Relative Angabe zu heute: „heute", „morgen", „in 5 Tagen", „gestern", „vor 3 Tagen". */
export function formatDaysFromToday(iso: string, todayIso: string): string {
  const days = differenceInCalendarDays(parseISO(iso), parseISO(todayIso));
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'gestern';
  return days > 0 ? `in ${days} Tagen` : `vor ${-days} Tagen`;
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
