import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { OTHER_SLICE_ID, type CategorySlice } from '../lib/expenses';
import { formatCHF } from '../lib/money';

interface CategoryDonutProps {
  slices: CategorySlice[];
  total: number;
  /** Aktuell gefilterte Kategorie (wird in der Legende hervorgehoben) */
  selectedId?: string;
  onSelect?: (id: string) => void;
}

const SIZE = 176;

function formatShare(share: number): string {
  return `${Math.round(share * 100)} %`;
}

function SliceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategorySlice }[];
}) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="font-medium">
        {slice.icon} {slice.name}
      </div>
      <div className="text-slate-600 dark:text-slate-300">
        {formatCHF(slice.total)} · {formatShare(slice.share)}
      </div>
    </div>
  );
}

/**
 * Monatsübersicht nach Kategorien. Die Legende mit Betrag und Anteil ist immer
 * sichtbar, damit die Zuordnung nie allein über die Farbe erfolgt.
 */
export function CategoryDonut({ slices, total, selectedId, onSelect }: CategoryDonutProps) {
  // Alle Betragsspalten so breit wie der längste Betrag, damit Prozente und Beträge
  // untereinander stehen (Ziffern sind dank tabular-nums gleich breit).
  const amountWidth = `${Math.max(0, ...slices.map((s) => formatCHF(s.total).length))}ch`;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <figure className="relative shrink-0" aria-label="Ausgaben nach Kategorie">
        <PieChart width={SIZE} height={SIZE}>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="name"
            innerRadius={58}
            outerRadius={86}
            startAngle={90}
            endAngle={-270}
            stroke="currentColor"
            strokeWidth={2}
            cornerRadius={4}
            className="text-white dark:text-slate-900"
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell
                key={s.id}
                fill={s.color}
                opacity={selectedId && selectedId !== s.id ? 0.35 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<SliceTooltip />} />
        </PieChart>
        <figcaption className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
          <span className="text-base font-bold">{formatCHF(total)}</span>
        </figcaption>
      </figure>

      {/* Neben dem Diagramm nur den Restplatz nehmen (w-full würde über die Karte hinausragen). */}
      <ul className="w-full min-w-0 space-y-0.5 sm:w-auto sm:flex-1" aria-label="Legende">
        {slices.map((s) => {
          const selected = selectedId === s.id;
          const row = (
            <>
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span aria-hidden="true" className="shrink-0">
                {s.icon}
              </span>
              <span className="min-w-0 flex-1 truncate" title={s.name}>
                {s.name}
              </span>
              <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-slate-500 dark:text-slate-400">
                {formatShare(s.share)}
              </span>
              {/* Breite nach Inhalt statt fest: Grosse Beträge passen, gekürzt wird nur der Name. */}
              <span
                className="shrink-0 whitespace-nowrap text-right font-medium tabular-nums"
                style={{ minWidth: amountWidth }}
              >
                {formatCHF(s.total)}
              </span>
            </>
          );
          const cls = `flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left ${
            selected ? 'bg-slate-100 dark:bg-slate-800' : ''
          }`;
          return (
            <li key={s.id}>
              {onSelect && s.id !== OTHER_SLICE_ID ? (
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(s.id)}
                  className={`${cls} hover:bg-slate-50 dark:hover:bg-slate-800/60`}
                >
                  {row}
                </button>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
