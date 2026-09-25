import { describe, expect, it } from 'vitest';
import { fitWithin, normalizeIllumination, toGrayscaleWithContrast } from './image';

/** Graustufen-RGBA aus einer Zeile Grauwerte */
function grayRow(values: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(values.flatMap((v) => [v, v, v, 255]));
}

describe('normalizeIllumination', () => {
  it('macht Papier im Schatten und im Licht gleich hell, Schrift bleibt dunkel', () => {
    // links belichtet (Papier 220, Schrift 60), rechts im Schatten (Papier 110, Schrift 30)
    const lit = [220, 220, 60, 220, 220, 220, 60, 220];
    const shadow = [110, 110, 30, 110, 110, 110, 30, 110];
    const data = grayRow([...lit, ...shadow]);
    normalizeIllumination(data, 16, 1, 3);
    const out = Array.from(data).filter((_, i) => i % 4 === 0);

    // Papier: beidseits nahezu weiss; Schrift: beidseits deutlich dunkler als Papier
    for (const i of [0, 4, 11, 15]) expect(out[i]).toBeGreaterThan(230);
    for (const i of [2, 6, 10, 14]) expect(out[i]).toBeLessThan(110);
    // Alpha bleibt unverändert
    expect(data[3]).toBe(255);
  });
});

describe('fitWithin', () => {
  it('verkleinert proportional auf die längste Kante', () => {
    expect(fitWithin(4000, 3000, 1800)).toEqual({ width: 1800, height: 1350 });
    expect(fitWithin(3024, 4032, 1200)).toEqual({ width: 900, height: 1200 });
  });

  it('vergrössert nie', () => {
    expect(fitWithin(800, 600, 1800)).toEqual({ width: 800, height: 600 });
  });
});

describe('toGrayscaleWithContrast', () => {
  it('wandelt in Graustufen um und streckt den Kontrast', () => {
    // zwei Pixel: dunkles Rot und helles Grau
    const data = new Uint8ClampedArray([100, 0, 0, 255, 200, 200, 200, 128]);
    toGrayscaleWithContrast(data);
    expect(Array.from(data)).toEqual([0, 0, 0, 255, 255, 255, 255, 128]);
  });

  it('lässt einfarbige Bilder unverändert grau', () => {
    const data = new Uint8ClampedArray([50, 50, 50, 255, 50, 50, 50, 255]);
    toGrayscaleWithContrast(data);
    expect(Array.from(data)).toEqual([50, 50, 50, 255, 50, 50, 50, 255]);
  });
});
