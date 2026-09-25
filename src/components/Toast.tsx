import { useEffect } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
}

/** Kurze Rückmeldung oberhalb der Tab-Leiste, optional mit Aktion (z. B. „Rückgängig"). */
export function Toast({ toast, onDismiss, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4"
    >
      {toast && (
        <div className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-xl bg-slate-900 py-2 pl-4 pr-2 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          <span>{toast.text}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss();
              }}
              className="min-h-11 rounded-lg px-3 font-semibold text-brand-100 hover:bg-white/10 dark:text-brand-700 dark:hover:bg-slate-900/10"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
