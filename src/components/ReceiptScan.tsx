import { useEffect, useState } from 'react';
import { useEntryCategories } from '../db/hooks';
import { todayISO } from '../lib/date';
import { prepareReceipt } from '../lib/image';
import { recognizeText, type OcrProgress } from '../lib/ocr';
import { parseReceipt, type ParsedReceipt } from '../lib/receiptParser';
import type { Expense } from '../types';
import { ExpenseForm, type ExpenseDraft } from './ExpenseForm';
import { buttonClass } from './styles';

interface ReceiptScanProps {
  file: File;
  onSave: (expense: ExpenseDraft) => void;
  onCancel: () => void;
}

type ScanState =
  | { phase: 'working'; progress?: OcrProgress }
  | { phase: 'review'; initial: Partial<Expense>; parsed?: ParsedReceipt; failed: boolean };

function describeFound(parsed: ParsedReceipt | undefined): string {
  const found = [
    parsed?.amount !== undefined && 'Betrag',
    parsed?.date && 'Datum',
    parsed?.merchant && 'Händler',
  ].filter(Boolean);
  if (found.length === 0) return 'Es konnte nichts erkannt werden. Bitte die Angaben eintragen.';
  return `Erkannt: ${found.join(', ')}. Bitte prüfen und bei Bedarf korrigieren.`;
}

function ProgressView({ progress, onCancel }: { progress?: OcrProgress; onCancel: () => void }) {
  const recognizing = progress?.step === 'recognizing';
  const percent = Math.round((progress?.progress ?? 0) * 100);
  const label = recognizing
    ? 'Text wird erkannt …'
    : progress
      ? 'Texterkennung wird geladen …'
      : 'Bild wird vorbereitet …';
  return (
    <div className="space-y-4 py-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-6 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-500"
        />
        <span className="font-medium">{label}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={recognizing ? percent : undefined}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div
          className={`h-full rounded-full bg-brand-600 ${recognizing ? 'transition-[width]' : 'w-1/3 animate-pulse'}`}
          style={recognizing ? { width: `${percent}%` } : undefined}
        />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Die Erkennung läuft vollständig auf deinem Gerät.
      </p>
      <button type="button" className={buttonClass('secondary')} onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  );
}

/** Quittung verarbeiten und als vorausgefülltes Formular zur Bestätigung anzeigen. */
export function ReceiptScan({ file, onSave, onCancel }: ReceiptScanProps) {
  const categories = useEntryCategories();
  const [state, setState] = useState<ScanState>({ phase: 'working' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let storedImage: Blob | undefined;
      try {
        const prepared = await prepareReceipt(file);
        storedImage = prepared.storedImage;
        const text = await recognizeText(prepared.ocrImage, (progress) => {
          if (!cancelled) setState({ phase: 'working', progress });
        });
        if (cancelled) return;
        const parsed = parseReceipt(text, todayISO());
        setState({
          phase: 'review',
          parsed,
          failed: false,
          initial: {
            amount: parsed.amount,
            date: parsed.date,
            merchant: parsed.merchant,
            categoryId: parsed.categoryId,
            receiptImage: storedImage,
            source: 'scan',
          },
        });
      } catch (error) {
        console.error('Quittungsscan fehlgeschlagen', error);
        if (cancelled) return;
        // Auch ohne Erkennung weiter: Bild behalten, Angaben manuell ergänzen.
        setState({
          phase: 'review',
          failed: true,
          initial: { receiptImage: storedImage, source: 'scan' },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (state.phase === 'working')
    return <ProgressView progress={state.progress} onCancel={onCancel} />;
  if (!categories) return null;

  return (
    <div className="space-y-4">
      <p
        role="status"
        className={`rounded-xl px-3 py-2 text-sm ${
          state.failed
            ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
            : 'bg-brand-50 text-brand-800 dark:bg-slate-800 dark:text-slate-200'
        }`}
      >
        {state.failed
          ? 'Die Texterkennung ist fehlgeschlagen. Beim ersten Scan wird eine Internetverbindung benötigt. Du kannst die Angaben auch manuell eintragen.'
          : describeFound(state.parsed)}
      </p>
      <ExpenseForm
        initial={state.initial}
        categories={categories}
        onSubmit={onSave}
        submitLabel="Ausgabe speichern"
      />
      <button type="button" className={buttonClass('ghost', 'w-full')} onClick={onCancel}>
        Verwerfen
      </button>
    </div>
  );
}
