import { describe, expect, it } from 'vitest';
import { formatAmount, formatCHF, parseAmount, toInputValue } from './money';

describe('formatCHF', () => {
  it.each([
    [0, 'CHF 0.00'],
    [5, 'CHF 0.05'],
    [150, 'CHF 1.50'],
    [99999, 'CHF 999.99'],
    [123450, "CHF 1'234.50"],
    [100000000, "CHF 1'000'000.00"],
    [-123450, "CHF -1'234.50"],
  ])('%i Rappen → %s', (rappen, expected) => {
    expect(formatCHF(rappen)).toBe(expected);
  });

  it('rundet Bruchteile von Rappen', () => {
    expect(formatAmount(1234.6)).toBe('12.35');
  });
});

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12,50', 1250],
    ['0.05', 5],
    ['.5', 50],
    [',95', 95],
    ['12.', 1200],
    ["1'234.50", 123450],
    ['1 234,50', 123450],
    ['1’234.50', 123450],
    ['CHF 45.90', 4590],
    ['  7,20  ', 720],
  ])('"%s" → %i', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', ' ', '.', 'abc', '12.345', '1.2.3', '-5', '12,5,0', '1e3'])(
    'lehnt "%s" ab',
    (input) => {
      expect(parseAmount(input)).toBeNull();
    },
  );

  it('ist frei von Gleitkommafehlern', () => {
    // 0.1 + 0.2 wäre als Float problematisch
    expect(parseAmount('0.29')).toBe(29);
    expect(parseAmount('1.15')).toBe(115);
  });
});

describe('toInputValue', () => {
  it('wandelt Rappen in Eingabewert um', () => {
    expect(toInputValue(123450)).toBe('1234.50');
    expect(toInputValue(5)).toBe('0.05');
  });
});
