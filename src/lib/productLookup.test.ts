import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupProduct, productName } from './productLookup';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('productName', () => {
  it('stellt die Marke voran, ohne sie zu verdoppeln', () => {
    expect(productName({ product_name: 'Red Bull', brands: 'Red Bull' })).toBe('Red Bull');
    expect(productName({ product_name: 'Energy Drink', brands: 'Red Bull, Red Bull GmbH' })).toBe(
      'Red Bull Energy Drink',
    );
    expect(productName({ product_name: 'Zero', product_name_de: 'Zuckerfrei' })).toBe('Zuckerfrei');
    expect(productName({ brands: 'Ovomaltine' })).toBe('Ovomaltine');
    expect(productName({})).toBeUndefined();
  });
});

describe('lookupProduct', () => {
  it('liefert Name und Kategorie, undefined für unbekannte Nummern', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('7610000000000')
          ? Response.json({ status: 0 })
          : Response.json({ status: 1, product: { product_name: 'Red Bull' } }),
      ),
    );
    expect(await lookupProduct('9002490100070')).toEqual({
      name: 'Red Bull',
      categoryId: 'var-lebensmittel',
    });
    expect(await lookupProduct('7610000000000')).toBeUndefined();
  });

  it('fragt ungültige Nummern gar nicht erst ab und wirft bei Serverfehlern', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await lookupProduct('abc')).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(lookupProduct('9002490100070')).rejects.toThrow('HTTP 503');
  });
});
