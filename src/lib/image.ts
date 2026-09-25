/** Bildvorbereitung für den Quittungsscan. */

/** Längste Kante für die Texterkennung (grösser bringt kaum mehr, kostet aber Zeit). */
export const OCR_MAX_EDGE = 1800;
/** Längste Kante für das gespeicherte Quittungsbild. */
export const STORED_MAX_EDGE = 1200;
export const STORED_JPEG_QUALITY = 0.7;

/** Skaliert proportional, sodass die längste Kante höchstens `maxEdge` ist (nie vergrössern). */
export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Wandelt RGBA-Pixel in Graustufen um (Luminanz nach ITU-R BT.601) und streckt den
 * Kontrast auf den vollen Wertebereich. Arbeitet direkt auf dem Array.
 */
export function toGrayscaleWithContrast(data: Uint8ClampedArray): void {
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
    data[i] = gray;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const range = max - min;
  for (let i = 0; i < data.length; i += 4) {
    const value = range > 0 ? Math.round(((data[i]! - min) / range) * 255) : data[i]!;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
}

/**
 * Gleicht ungleichmässige Beleuchtung aus (Schatten, Lichtverlauf): Jeder Pixel wird
 * durch die mittlere Helligkeit seiner Umgebung geteilt. Papier wird so überall hell,
 * Schrift bleibt dunkel – auch im Schatten. Ohne diesen Schritt wählt Tesseract einen
 * einzigen Schwellwert fürs ganze Bild, und Text im Schatten wird schwarz.
 * Erwartet Graustufen-RGBA (R = G = B) und arbeitet direkt auf dem Array.
 */
export function normalizeIllumination(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius = Math.max(8, Math.round(Math.max(width, height) / 40)),
): void {
  // Integralbild: Summe aller Pixel oberhalb/links, für Fenstermittelwerte in O(1).
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += data[(y * width + x) * 4]!;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1]! + rowSum;
    }
  }
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width, x + radius + 1);
      const sum =
        integral[y1 * stride + x1]! -
        integral[y0 * stride + x1]! -
        integral[y1 * stride + x0]! +
        integral[y0 * stride + x0]!;
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const i = (y * width + x) * 4;
      const value = mean > 0 ? Math.min(255, Math.round((data[i]! / mean) * 255)) : 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }
}

export interface PreparedReceipt {
  /** Graustufen-PNG für die Texterkennung */
  ocrImage: Blob;
  /** Verkleinertes Graustufen-JPEG zum Speichern */
  storedImage: Blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht erzeugt werden.'))),
      type,
      quality,
    ),
  );
}

function drawGrayscale(
  bitmap: ImageBitmap,
  maxEdge: number,
  { evenLighting = false } = {},
): HTMLCanvasElement {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas wird nicht unterstützt.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  toGrayscaleWithContrast(imageData.data);
  if (evenLighting) normalizeIllumination(imageData.data, width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Verkleinert das Foto und wandelt es in Graustufen um (EXIF-Drehung wird berücksichtigt). */
export async function prepareReceipt(file: Blob): Promise<PreparedReceipt> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const ocrCanvas = drawGrayscale(bitmap, OCR_MAX_EDGE, { evenLighting: true });
    const storedCanvas = drawGrayscale(bitmap, STORED_MAX_EDGE);
    const [ocrImage, storedImage] = await Promise.all([
      canvasToBlob(ocrCanvas, 'image/png'),
      canvasToBlob(storedCanvas, 'image/jpeg', STORED_JPEG_QUALITY),
    ]);
    return { ocrImage, storedImage };
  } finally {
    bitmap.close();
  }
}
