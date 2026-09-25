import type { Worker } from 'tesseract.js';

/**
 * Texterkennung mit Tesseract.js. Tesseract läuft in einem eigenen Web Worker,
 * die Oberfläche bleibt also flüssig. Worker, WASM-Core und deutsche Sprachdaten
 * werden von der eigenen Domain geladen (siehe scripts/copy-tesseract.mjs) –
 * es verlassen keine Daten das Gerät.
 */

export type OcrStep = 'loading' | 'recognizing';

export interface OcrProgress {
  step: OcrStep;
  /** 0..1 */
  progress: number;
}

type ProgressListener = (progress: OcrProgress) => void;

let workerPromise: Promise<Worker> | null = null;
let listener: ProgressListener | undefined;

function assetUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}tesseract/${path}`, window.location.href).href;
}

function getWorker(): Promise<Worker> {
  workerPromise ??= (async () => {
    // Tesseract.js erst beim ersten Scan laden.
    const { createWorker, OEM } = await import('tesseract.js');
    return createWorker('deu', OEM.LSTM_ONLY, {
      workerPath: assetUrl('worker.min.js'),
      corePath: assetUrl('core'),
      langPath: assetUrl('lang'),
      workerBlobURL: false,
      logger: (m: { status: string; progress: number }) => {
        const step: OcrStep = m.status === 'recognizing text' ? 'recognizing' : 'loading';
        listener?.({ step, progress: m.progress });
      },
    });
  })().catch((error: unknown) => {
    // Beim nächsten Versuch neu starten (z. B. wenn die Sprachdaten offline fehlten).
    workerPromise = null;
    throw error;
  });
  return workerPromise;
}

/** Erkennt den Text im Bild. Nur ein Scan gleichzeitig. */
export async function recognizeText(image: Blob, onProgress?: ProgressListener): Promise<string> {
  listener = onProgress;
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    listener = undefined;
  }
}
