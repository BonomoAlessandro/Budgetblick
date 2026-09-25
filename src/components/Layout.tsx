import { useCallback, useEffect, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { deleteExpense, saveExpense } from '../db/repo';
import { formatCHF } from '../lib/money';
import { BottomSheet } from './BottomSheet';
import { QuickAdd } from './QuickAdd';
import { TabBar } from './TabBar';
import { Toast, type ToastMessage } from './Toast';

/** URL-Parameter, der die Schnellerfassung direkt öffnet (PWA-App-Shortcut). */
export const QUICK_ADD_PARAM = 'erfassen';

export function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Der App-Shortcut startet die App mit ?erfassen: Schnellerfassung direkt öffnen.
  const [quickAddOpen, setQuickAddOpen] = useState(() => searchParams.has(QUICK_ADD_PARAM));
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    // Parameter danach entfernen, damit ein Neuladen das Sheet nicht erneut öffnet.
    if (!searchParams.has(QUICK_ADD_PARAM)) return;
    const next = new URLSearchParams(searchParams);
    next.delete(QUICK_ADD_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <main className="px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <TabBar onQuickAdd={() => setQuickAddOpen(true)} />
      <BottomSheet
        open={quickAddOpen}
        title="Ausgabe erfassen"
        onClose={() => setQuickAddOpen(false)}
      >
        <QuickAdd
          onSave={async (expense, category) => {
            const id = await saveExpense(expense);
            setQuickAddOpen(false);
            setToast({
              id: Date.now(),
              text: `${formatCHF(expense.amount)} · ${category.name} gespeichert`,
              actionLabel: 'Rückgängig',
              onAction: () => void deleteExpense(id),
            });
          }}
        />
      </BottomSheet>
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
