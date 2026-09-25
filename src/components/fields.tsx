import { useId, useState, type ReactNode } from 'react';
import { buttonClass } from './styles';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
  }) => ReactNode;
}

/** Beschriftetes Formularfeld mit Fehlermeldung. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const message = error ?? hint;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p
          id={messageId}
          className={`text-sm ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

interface ConfirmDeleteButtonProps {
  onConfirm: () => void;
  label?: string;
}

/** Löschen in zwei Schritten: erster Tipp fragt nach, zweiter löscht. */
export function ConfirmDeleteButton({ onConfirm, label = 'Löschen' }: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        className={buttonClass('secondary', 'text-red-600 dark:text-red-400')}
        onClick={() => setConfirming(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" className={buttonClass('danger')} onClick={onConfirm}>
        Wirklich löschen
      </button>
      <button
        type="button"
        className={buttonClass('secondary')}
        onClick={() => setConfirming(false)}
      >
        Abbrechen
      </button>
    </div>
  );
}
