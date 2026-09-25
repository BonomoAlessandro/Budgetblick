import type { BarcodeDetector } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

/**
 * Barcodes (EAN/UPC auf Produkten) und QR-Codes lesen mit ZXing (WebAssembly),
 * auch auf iOS, wo es keinen nativen BarcodeDetector gibt. Die .wasm-Datei kommt
 * von der eigenen Domain statt vom CDN – es verlassen keine Bilder das Gerät.
 */

export type CodeSource = HTMLVideoElement | Blob;

/** Artikelnummern auf Produkten */
export const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;
export type ProductFormat = (typeof PRODUCT_FORMATS)[number];

export interface ScannedCode {
  text: string;
  format: string;
}

export function isProductFormat(format: string): format is ProductFormat {
  return (PRODUCT_FORMATS as readonly string[]).includes(format);
}

let detectorPromise: Promise<BarcodeDetector> | null = null;

/** Lädt den Leser beim ersten Scan; wirft, wenn die .wasm-Datei nicht geladen werden kann. */
export function loadCodeReader(): Promise<BarcodeDetector> {
  detectorPromise ??= (async () => {
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
    await prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith('.wasm') ? wasmUrl : prefix + path,
      },
      fireImmediately: true,
    });
    return new BarcodeDetector({ formats: ['qr_code', ...PRODUCT_FORMATS] });
  })().catch((error: unknown) => {
    // Beim nächsten Versuch neu laden (z.B. wieder online).
    detectorPromise = null;
    throw error;
  });
  return detectorPromise;
}

/** Erster gefundener Code oder undefined. */
export async function readCode(source: CodeSource): Promise<ScannedCode | undefined> {
  const detector = await loadCodeReader();
  const [first] = await detector.detect(source);
  return first ? { text: first.rawValue, format: first.format } : undefined;
}
