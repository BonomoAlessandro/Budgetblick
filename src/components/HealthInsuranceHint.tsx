import { HEALTH_INSURANCE_HINT_TEXT } from '../lib/swissHints';
import { Icon } from './Icon';

interface HealthInsuranceHintProps {
  onDismiss: () => void;
}

export function HealthInsuranceHint({ onDismiss }: HealthInsuranceHintProps) {
  return (
    <aside
      aria-label="Hinweis Krankenkassenwechsel"
      className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
    >
      <span aria-hidden="true" className="text-xl">
        🩺
      </span>
      <p className="flex-1 text-sm">{HEALTH_INSURANCE_HINT_TEXT}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hinweis für dieses Jahr ausblenden"
        className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/50"
      >
        <Icon name="close" className="size-5" />
      </button>
    </aside>
  );
}
