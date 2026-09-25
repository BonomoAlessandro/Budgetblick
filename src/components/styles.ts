/** Gemeinsame Tailwind-Klassen für Formularelemente und Buttons. */

export const inputClass =
  'block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30 aria-invalid:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-brand-700 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-slate-800',
};

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-base font-semibold disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${extra}`;
}
