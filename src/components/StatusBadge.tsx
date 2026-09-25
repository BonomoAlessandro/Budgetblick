import { CONTRACT_STATUS_LABELS, type ContractStatus } from '../lib/contracts';

/** Farbe + Symbol + Text, damit der Status nie nur über die Farbe erkennbar ist. */
const STYLES: Record<ContractStatus, { className: string; dot: string; symbol: string }> = {
  ok: {
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    symbol: '✓',
  },
  bald: {
    className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-500',
    symbol: '⏰',
  },
  dringend: {
    className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    dot: 'bg-red-600',
    symbol: '⚠',
  },
  verpasst: {
    className: 'bg-rose-200 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
    dot: 'bg-rose-800 dark:bg-rose-400',
    symbol: '✕',
  },
  gekuendigt: {
    className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
    symbol: '✓',
  },
  beendet: {
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    dot: 'bg-slate-300 dark:bg-slate-600',
    symbol: '–',
  },
};

/** Punkt in der Status-Farbe, z. B. für die Zeitleiste. */
export function StatusDot({
  status,
  className = '',
}: {
  status: ContractStatus;
  className?: string;
}) {
  return <span aria-hidden="true" className={`${STYLES[status].dot} ${className}`} />;
}

export function StatusBadge({ status }: { status: ContractStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style.className}`}
    >
      <span aria-hidden="true">{style.symbol}</span>
      {CONTRACT_STATUS_LABELS[status]}
    </span>
  );
}
