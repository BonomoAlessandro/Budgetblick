import { useCallback, useEffect, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { deleteExpense, saveExpense } from '../db/repo';
import { formatCHF } from '../lib/money';
import { BottomSheet } from './BottomSheet';
import { CodeScan } from './CodeScan';
import { QuickAdd } from './QuickAdd';
import { ReceiptScan } from './ReceiptScan';
import { TabBar } from './TabBar';
import { Toast, type ToastMessage } from './Toast';

/** URL-Parameter, der die Schnellerfassung direkt öffnet (PWA-App-Shortcut). */
export const QUICK_ADD_PARAM = 'erfassen';

export function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Der App-Shortcut startet die App mit ?erfassen: Schnellerfassung direkt öffnen.
  const [quickAddOpen, setQuickAddOpen] = useState(() => searchParams.has(QUICK_ADD_PARAM));
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [codeScanOpen, setCodeScanOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const closeSheet = useCallback(() => {
    setQuickAddOpen(false);
    setScanFile(null);
    setCodeScanOpen(false);
  }, []);

  const showSaved = (text: string, id: string) =>
    setToast({
      id: Date.now(),
      text,
      actionLabel: 'Rückgängig',
      onAction: () => void deleteExpense(id),
    });

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
        title={scanFile ? 'Quittung prüfen' : codeScanOpen ? 'Code scannen' : 'Ausgabe erfassen'}
        onClose={closeSheet}
      >
        {scanFile ? (
          <ReceiptScan
            file={scanFile}
            onCancel={() => setScanFile(null)}
            onSave={async (expense) => {
              const id = await saveExpense(expense);
              closeSheet();
              showSaved(`${formatCHF(expense.amount)} gespeichert`, id);
            }}
          />
        ) : codeScanOpen ? (
          <CodeScan
            onCancel={() => setCodeScanOpen(false)}
            onSave={async (expense) => {
              const id = await saveExpense(expense);
              closeSheet();
              showSaved(`${formatCHF(expense.amount)} gespeichert`, id);
            }}
          />
        ) : (
          <QuickAdd
            onScan={setScanFile}
            onCodeScan={() => setCodeScanOpen(true)}
            onSave={async (expense, category) => {
              const id = await saveExpense(expense);
              closeSheet();
              showSaved(`${formatCHF(expense.amount)} · ${category.name} gespeichert`, id);
            }}
          />
        )}
      </BottomSheet>
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
