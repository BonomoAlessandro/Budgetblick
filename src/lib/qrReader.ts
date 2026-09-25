import type { BarcodeDetector } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

/**
 * QR-Codes lesen mit ZXing (WebAssembly), auch auf iOS, wo es keinen
 * nativen BarcodeDetector gibt. Die .wasm-Datei kommt von der eigenen Domain
 * statt vom CDN – es verlassen keine Bilder das Gerät.
 */

export type QrSource = HTMLVideoElement | Blob;

let detectorPromise: Promise<BarcodeDetector> | null = null;

/** Lädt den Leser beim ersten Scan; wirft, wenn die .wasm-Datei nicht geladen werden kann. */
export function loadQrReader(): Promise<BarcodeDetector> {
  detectorPromise ??= (async () => {
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
    await prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith('.wasm') ? wasmUrl : prefix + path,
      },
      fireImmediately: true,
    });
    return new BarcodeDetector({ formats: ['qr_code'] });
  })().catch((error: unknown) => {
    // Beim nächsten Versuch neu laden (z.B. wieder online).
    detectorPromise = null;
    throw error;
  });
  return detectorPromise;
}

/** Inhalt des ersten gefundenen QR-Codes oder undefined. */
export async function readQr(source: QrSource): Promise<string | undefined> {
  const detector = await loadQrReader();
  const [first] = await detector.detect(source);
  return first?.rawValue;
}
