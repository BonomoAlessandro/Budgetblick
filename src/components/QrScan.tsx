import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCategories } from '../db/hooks';
import { classifyQr, type QrBill, type QrContent } from '../lib/qrBill';
import { loadQrReader, readQr } from '../lib/qrReader';
import { KNOWN_MERCHANTS } from '../lib/receiptParser';
import type { Expense } from '../types';
import { ExpenseForm, type ExpenseDraft } from './ExpenseForm';
import { buttonClass } from './styles';

interface QrScanProps {
  onSave: (expense: ExpenseDraft) => void;
  /** Zurück zur Schnellerfassung */
  onCancel: () => void;
}

type ScanState =
  | { phase: 'camera' }
  /** Keine Kamera oder kein Zugriff: QR-Code per Foto einlesen */
  | { phase: 'photo'; reason: string }
  | { phase: 'failed' }
  | { phase: 'result'; content: QrContent };

/** Pause zwischen zwei Leseversuchen im Kamerabild */
const SCAN_INTERVAL_MS = 200;

function billToInitial(bill: QrBill): Partial<Expense> {
  const name = bill.creditor.toLowerCase();
  return {
    // Ausgaben werden in CHF geführt: Euro-Beträge nicht übernehmen.
    amount: bill.currency === 'CHF' ? bill.amount : undefined,
    merchant: bill.creditor || undefined,
    note: bill.message,
    categoryId: KNOWN_MERCHANTS.find((m) => m.pattern.test(name))?.categoryId,
    source: 'scan',
  };
}

function describeBill(bill: QrBill): string {
  const from = bill.creditor ? ` von ${bill.creditor}` : '';
  if (bill.currency === 'EUR')
    return `QR-Rechnung${from} erkannt. Sie lautet auf EUR${bill.amount !== undefined ? ` ${(bill.amount / 100).toFixed(2)}` : ''} – bitte den Betrag in CHF eintragen.`;
  if (bill.amount === undefined)
    return `QR-Rechnung${from} erkannt, sie enthält keinen Betrag. Bitte den Betrag eintragen.`;
  return `QR-Rechnung${from} erkannt. Bitte prüfen und bei Bedarf korrigieren.`;
}

function Notice({ tone, children }: { tone: 'info' | 'warn'; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`rounded-xl px-3 py-2 text-sm break-words ${
        tone === 'warn'
          ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
          : 'bg-brand-50 text-brand-800 dark:bg-slate-800 dark:text-slate-200'
      }`}
    >
      {children}
    </p>
  );
}

function PhotoInput({ onFile }: { onFile: (file: File) => void }) {
  return (
    <label className={buttonClass('primary', 'w-full cursor-pointer focus-within:outline-2')}>
      Foto des QR-Codes wählen
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/** QR-Code mit der Kamera lesen; eine Swiss QR-Rechnung füllt das Formular vor. */
export function QrScan({ onSave, onCancel }: QrScanProps) {
  const categories = useCategories('variable');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>(() =>
    // Ohne HTTPS (oder in jsdom) fehlt navigator.mediaDevices ganz.
    typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? { phase: 'camera' }
      : { phase: 'photo', reason: 'Die Kamera ist in diesem Browser nicht verfügbar.' },
  );
  const [photoError, setPhotoError] = useState<string>();

  useEffect(() => {
    if (state.phase !== 'camera') return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        await loadQrReader();
      } catch (error) {
        console.error('QR-Leser konnte nicht geladen werden', error);
        if (!stopped) setState({ phase: 'failed' });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch (error) {
        console.error('Kein Kamerazugriff', error);
        if (!stopped)
          setState({
            phase: 'photo',
            reason:
              'Kein Zugriff auf die Kamera. Du kannst den Zugriff in den Browser-Einstellungen erlauben oder ein Foto wählen.',
          });
        return;
      }
      const video = videoRef.current;
      if (stopped || !video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const tick = async () => {
        if (stopped) return;
        try {
          const value = video.readyState >= 2 ? await readQr(video) : undefined;
          if (value && !stopped) {
            setState({ phase: 'result', content: classifyQr(value) });
            return;
          }
        } catch (error) {
          console.error('QR-Code lesen fehlgeschlagen', error);
        }
        if (!stopped) timer = setTimeout(tick, SCAN_INTERVAL_MS);
      };
      void tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [state.phase]);

  async function scanPhoto(file: File) {
    setPhotoError(undefined);
    try {
      const value = await readQr(file);
      if (value) setState({ phase: 'result', content: classifyQr(value) });
      else
        setPhotoError(
          'Auf dem Foto wurde kein QR-Code gefunden. Bitte näher und scharf fotografieren.',
        );
    } catch (error) {
      console.error('QR-Code lesen fehlgeschlagen', error);
      setState({ phase: 'failed' });
    }
  }

  const retry = () => setState({ phase: 'camera' });
  const back = (
    <button type="button" className={buttonClass('ghost', 'w-full')} onClick={onCancel}>
      Manuell erfassen
    </button>
  );

  if (state.phase === 'camera')
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-slate-950">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label="Kamerabild"
            className="aspect-square w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[15%] rounded-2xl border-4 border-white/80"
          />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Halte den QR-Code einer Rechnung in den Rahmen. Die Erkennung läuft vollständig auf deinem
          Gerät.
        </p>
        {back}
      </div>
    );

  if (state.phase === 'photo')
    return (
      <div className="space-y-4">
        <Notice tone="warn">{state.reason}</Notice>
        {photoError && <Notice tone="warn">{photoError}</Notice>}
        <PhotoInput onFile={(file) => void scanPhoto(file)} />
        {back}
      </div>
    );

  if (state.phase === 'failed')
    return (
      <div className="space-y-4">
        <Notice tone="warn">
          Der QR-Leser konnte nicht geladen werden. Beim ersten Scan wird eine Internetverbindung
          benötigt.
        </Notice>
        <button type="button" className={buttonClass('secondary', 'w-full')} onClick={retry}>
          Erneut versuchen
        </button>
        {back}
      </div>
    );

  const { content } = state;
  if (content.kind !== 'bill')
    return (
      <div className="space-y-4">
        <Notice tone="warn">
          {content.kind === 'url' ? (
            <>
              Dieser QR-Code enthält keine Rechnung, sondern einen Link:{' '}
              <a href={content.url} target="_blank" rel="noopener noreferrer" className="underline">
                {content.url}
              </a>
            </>
          ) : (
            'Dieser QR-Code ist keine Swiss QR-Rechnung.'
          )}
        </Notice>
        <button type="button" className={buttonClass('secondary', 'w-full')} onClick={retry}>
          Anderen QR-Code scannen
        </button>
        {back}
      </div>
    );

  if (!categories) return null;
  return (
    <div className="space-y-4">
      <Notice
        tone={
          content.bill.currency === 'CHF' && content.bill.amount !== undefined ? 'info' : 'warn'
        }
      >
        {describeBill(content.bill)}
      </Notice>
      <ExpenseForm
        initial={billToInitial(content.bill)}
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
