import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';
import { BottomSheet } from './BottomSheet';

export function Layout() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
        <p className="py-6 text-center text-slate-500 dark:text-slate-400">
          Die Schnellerfassung folgt in Phase 3.
        </p>
      </BottomSheet>
    </div>
  );
}
