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

function drawGrayscale(bitmap: ImageBitmap, maxEdge: number): HTMLCanvasElement {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas wird nicht unterstützt.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  toGrayscaleWithContrast(imageData.data);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Verkleinert das Foto und wandelt es in Graustufen um (EXIF-Drehung wird berücksichtigt). */
export async function prepareReceipt(file: Blob): Promise<PreparedReceipt> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const ocrCanvas = drawGrayscale(bitmap, OCR_MAX_EDGE);
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
