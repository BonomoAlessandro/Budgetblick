import { useEffect, useRef, useState, type ReactNode } from 'react';
import { db } from '../db/db';
import { SETTING_PRODUCT_LOOKUP, useCategories } from '../db/hooks';
import { rememberProduct } from '../db/repo';
import { isProductFormat, loadCodeReader, readCode, type ScannedCode } from '../lib/codeReader';
import { lookupProduct } from '../lib/productLookup';
import { classifyQr, type QrBill } from '../lib/qrBill';
import { KNOWN_MERCHANTS } from '../lib/receiptParser';
import type { Expense, Product } from '../types';
import { ExpenseForm, type ExpenseDraft } from './ExpenseForm';
import { buttonClass } from './styles';

interface CodeScanProps {
  onSave: (expense: ExpenseDraft) => void;
  /** Zurück zur Schnellerfassung */
  onCancel: () => void;
}

/** Woher die Angaben zu einem gescannten Produkt stammen */
type ProductOrigin = 'saved' | 'lookup' | 'unknown' | 'offline';

interface ScannedProduct {
  code: string;
  origin: ProductOrigin;
  name?: string;
  lastPrice?: number;
  categoryId?: string;
  merchant?: string;
}

type ScanState =
  | { phase: 'camera' }
  /** Keine Kamera oder kein Zugriff: Code per Foto einlesen */
  | { phase: 'photo'; reason: string }
  /** Leser nicht ladbar oder Lesen scheitert wiederholt */
  | { phase: 'failed'; cause: 'load' | 'read'; detail?: string }
  /** Produktname wird nachgeschlagen */
  | { phase: 'lookup'; code: string }
  | { phase: 'product'; product: ScannedProduct }
  | { phase: 'bill'; bill: QrBill }
  /** QR-Code ohne Rechnung */
  | { phase: 'other'; url?: string };

/** Pause zwischen zwei Leseversuchen im Kamerabild */
const SCAN_INTERVAL_MS = 200;
/** Nach so vielen Fehlern in Folge wird abgebrochen und der Fehler angezeigt. */
const MAX_READ_ERRORS = 10;

function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function fromSaved(saved: Product): ScannedProduct {
  const { code, name, lastPrice, categoryId, merchant } = saved;
  return { code, origin: 'saved', name, lastPrice, categoryId, merchant };
}

/** Gemerkte Angaben zuerst, sonst (falls erlaubt) Open Food Facts. */
async function resolveProduct(code: string, onLookup: () => void): Promise<ScannedProduct> {
  const saved = await db.products.get(code);
  if (saved) return fromSaved(saved);
  const setting = await db.settings.get(SETTING_PRODUCT_LOOKUP);
  if (setting?.value === false) return { code, origin: 'unknown' };
  onLookup();
  try {
    const info = await lookupProduct(code);
    return info ? { code, origin: 'lookup', ...info } : { code, origin: 'unknown' };
  } catch (error) {
    console.error('Produktsuche fehlgeschlagen', error);
    return { code, origin: 'offline' };
  }
}

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

function describeProduct(product: ScannedProduct): string {
  const later = 'Beim nächsten Scan sind die Angaben vorausgefüllt.';
  switch (product.origin) {
    case 'saved':
      return product.lastPrice !== undefined
        ? `${product.name ?? `Artikel ${product.code}`}: Preis vom letzten Kauf übernommen. Bitte prüfen.`
        : `${product.name ?? `Artikel ${product.code}`} erkannt. Bitte den Preis eingeben.`;
    case 'lookup':
      return `${product.name} (Open Food Facts). Bitte den Preis eingeben. ${later}`;
    case 'unknown':
      return `Artikel ${product.code} ist nicht bekannt. Bitte Preis und Produktname (Notiz) eingeben. ${later}`;
    case 'offline':
      return `Der Produktname konnte nicht nachgeschlagen werden (offline?). Bitte Preis und Produktname (Notiz) eingeben. ${later}`;
  }
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

function PhotoInput({
  onFile,
  label = 'Foto des Codes wählen',
  variant = 'primary',
}: {
  onFile: (file: File) => void;
  label?: string;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <label className={buttonClass(variant, 'w-full cursor-pointer focus-within:outline-2')}>
      {label}
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

/**
 * Barcode eines Produkts oder QR-Code einer Rechnung mit der Kamera lesen
 * und das Formular vorausfüllen. Gespeichert wird erst nach Bestätigung.
 */
export function CodeScan({ onSave, onCancel }: CodeScanProps) {
  const categories = useCategories('variable');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>(() =>
    // Ohne HTTPS (oder in jsdom) fehlt navigator.mediaDevices ganz.
    typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? { phase: 'camera' }
      : { phase: 'photo', reason: 'Die Kamera ist in diesem Browser nicht verfügbar.' },
  );
  const [photoError, setPhotoError] = useState<string>();
  /** Auflösung des Kamerabilds, zur Kontrolle unter dem Bild angezeigt */
  const [cameraSize, setCameraSize] = useState<string>();
  /** Verhindert, dass ein veraltetes Nachschlage-Ergebnis den Zustand überschreibt */
  const scanId = useRef(0);

  async function handleCode(code: ScannedCode) {
    const id = ++scanId.current;
    if (isProductFormat(code.format)) {
      const product = await resolveProduct(code.text, () => {
        if (id === scanId.current) setState({ phase: 'lookup', code: code.text });
      });
      if (id === scanId.current) setState({ phase: 'product', product });
      return;
    }
    const content = classifyQr(code.text);
    if (content.kind === 'bill') setState({ phase: 'bill', bill: content.bill });
    else setState({ phase: 'other', url: content.kind === 'url' ? content.url : undefined });
  }

  useEffect(() => {
    if (state.phase !== 'camera') return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        await loadCodeReader();
      } catch (error) {
        console.error('Code-Leser konnte nicht geladen werden', error);
        if (!stopped) setState({ phase: 'failed', cause: 'load', detail: errorText(error) });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // Hohe Auflösung: Kleine Codes (z.B. auf einer Dose) lassen sich dann auch
          // aus etwas Abstand lesen, wo die Kamera noch scharf stellt.
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
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

      let errors = 0;
      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2) {
            setCameraSize(`${video.videoWidth}×${video.videoHeight}`);
            const code = await readCode(video);
            errors = 0;
            if (code && !stopped) {
              // Kamera sofort freigeben, das Nachschlagen kann dauern.
              stream?.getTracks().forEach((track) => track.stop());
              void handleCode(code);
              return;
            }
          }
        } catch (error) {
          console.error('Code lesen fehlgeschlagen', error);
          errors += 1;
          if (errors >= MAX_READ_ERRORS) {
            if (!stopped) setState({ phase: 'failed', cause: 'read', detail: errorText(error) });
            return;
          }
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
      const code = await readCode(file);
      if (code) await handleCode(code);
      else
        setPhotoError(
          'Auf dem Foto wurde kein Code gefunden. Bitte näher und scharf fotografieren.',
        );
    } catch (error) {
      console.error('Code lesen fehlgeschlagen', error);
      setState({ phase: 'failed', cause: 'read', detail: errorText(error) });
    }
  }

  const retry = () => {
    scanId.current += 1;
    setState({ phase: 'camera' });
  };
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
            className="pointer-events-none absolute inset-x-[10%] inset-y-[22%] rounded-2xl border-4 border-white/80"
          />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Halte den Barcode eines Produkts oder den QR-Code einer Rechnung in den Rahmen, mit etwa
          15–20 cm Abstand, damit die Kamera scharf stellt.
        </p>
        <p role="status" className="text-xs text-slate-400 dark:text-slate-500">
          {cameraSize ? `Sucht Code … (Kamera ${cameraSize})` : 'Kamera wird gestartet …'}
        </p>
        {photoError && <Notice tone="warn">{photoError}</Notice>}
        <PhotoInput
          variant="secondary"
          label="Stattdessen Foto aufnehmen"
          onFile={(file) => void scanPhoto(file)}
        />
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
          {state.cause === 'load'
            ? 'Der Code-Leser konnte nicht geladen werden. Beim ersten Scan wird eine Internetverbindung benötigt.'
            : 'Beim Lesen des Codes ist ein Fehler aufgetreten.'}
          {state.detail && (
            <span className="mt-1 block font-mono text-xs opacity-80">{state.detail}</span>
          )}
        </Notice>
        <button type="button" className={buttonClass('secondary', 'w-full')} onClick={retry}>
          Erneut versuchen
        </button>
        {back}
      </div>
    );

  if (state.phase === 'lookup')
    return (
      <div className="space-y-4 py-4" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="size-6 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-500"
          />
          <span className="font-medium">Produkt wird nachgeschlagen …</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Artikel {state.code} · Open Food Facts
        </p>
      </div>
    );

  if (state.phase === 'other')
    return (
      <div className="space-y-4">
        <Notice tone="warn">
          {state.url ? (
            <>
              Dieser QR-Code enthält keine Rechnung, sondern einen Link:{' '}
              <a href={state.url} target="_blank" rel="noopener noreferrer" className="underline">
                {state.url}
              </a>
            </>
          ) : (
            'Dieser QR-Code ist keine Swiss QR-Rechnung.'
          )}
        </Notice>
        <button type="button" className={buttonClass('secondary', 'w-full')} onClick={retry}>
          Anderen Code scannen
        </button>
        {back}
      </div>
    );

  if (!categories) return null;

  const discard = (
    <button type="button" className={buttonClass('ghost', 'w-full')} onClick={onCancel}>
      Verwerfen
    </button>
  );

  if (state.phase === 'bill')
    return (
      <div className="space-y-4">
        <Notice
          tone={state.bill.currency === 'CHF' && state.bill.amount !== undefined ? 'info' : 'warn'}
        >
          {describeBill(state.bill)}
        </Notice>
        <ExpenseForm
          initial={billToInitial(state.bill)}
          categories={categories}
          onSubmit={onSave}
          submitLabel="Ausgabe speichern"
        />
        {discard}
      </div>
    );

  const { product } = state;
  return (
    <div className="space-y-4">
      <Notice tone={product.origin === 'saved' || product.origin === 'lookup' ? 'info' : 'warn'}>
        {describeProduct(product)}
      </Notice>
      <ExpenseForm
        initial={{
          amount: product.lastPrice,
          note: product.name,
          // Gemerkte Kategorie kann inzwischen gelöscht sein.
          categoryId: categories.some((c) => c.id === product.categoryId)
            ? product.categoryId
            : undefined,
          merchant: product.merchant,
          source: 'scan',
        }}
        categories={categories}
        onSubmit={async (expense) => {
          await rememberProduct({
            code: product.code,
            name: expense.note?.trim() || product.name,
            lastPrice: expense.amount,
            categoryId: expense.categoryId,
            merchant: expense.merchant,
          });
          onSave(expense);
        }}
        submitLabel="Ausgabe speichern"
      />
      {discard}
    </div>
  );
}
