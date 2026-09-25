/**
 * Produktname zu einer Artikelnummer bei Open Food Facts nachschlagen
 * (freie Datenbank, v.a. Lebensmittel und Getränke). Gesendet wird nur die Nummer.
 */

export interface ProductInfo {
  name: string;
  /** Vorgeschlagene Kategorie */
  categoryId?: string;
}

const API = 'https://world.openfoodfacts.org/api/v2/product/';
const TIMEOUT_MS = 6000;

interface OffResponse {
  status?: number;
  product?: { product_name?: string; product_name_de?: string; brands?: string };
}

/** «Red Bull, Red Bull GmbH» → «Red Bull» */
function firstBrand(brands: string | undefined): string {
  return (brands ?? '').split(',')[0]?.trim() ?? '';
}

/** Name mit Marke, ohne sie zu verdoppeln («Red Bull» + «Red Bull» → «Red Bull»). */
export function productName(product: NonNullable<OffResponse['product']>): string | undefined {
  const name = (product.product_name_de || product.product_name || '').trim();
  const brand = firstBrand(product.brands);
  if (!name) return brand || undefined;
  if (!brand || name.toLowerCase().includes(brand.toLowerCase())) return name;
  return `${brand} ${name}`;
}

/**
 * undefined, wenn das Produkt nicht bekannt ist.
 * Wirft bei Netzwerkfehlern (z.B. offline) oder Zeitüberschreitung.
 */
export async function lookupProduct(code: string): Promise<ProductInfo | undefined> {
  if (!/^\d{6,14}$/.test(code)) return undefined;
  const response = await fetch(`${API}${code}.json?fields=product_name,product_name_de,brands`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Unbekannte Nummern beantwortet die API mit 404.
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Open Food Facts: HTTP ${response.status}`);
  const data = (await response.json()) as OffResponse;
  if (data.status !== 1 || !data.product) return undefined;
  const name = productName(data.product);
  // Open Food Facts führt Lebensmittel und Getränke.
  return name ? { name, categoryId: 'var-lebensmittel' } : undefined;
}
