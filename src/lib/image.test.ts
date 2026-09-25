import { describe, expect, it } from 'vitest';
import { fitWithin, toGrayscaleWithContrast } from './image';

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
