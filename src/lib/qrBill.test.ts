import { describe, expect, it } from 'vitest';
import { qrBillPayload } from '../test/qrBill';
import { classifyQr, parseQrBill } from './qrBill';

describe('parseQrBill', () => {
  it('liest Empfänger, Betrag, Währung, Referenz und Mitteilung', () => {
    expect(parseQrBill(qrBillPayload())).toEqual({
      iban: 'CH4431999123000889012',
      creditor: 'Robert Schneider AG',
      amount: 194975,
      currency: 'CHF',
      reference: '210000000003139471430009017',
      message: 'Auftrag vom 15.06.2026',
    });
  });

  it('akzeptiert LF als Zeilentrenner und Beträge ohne Nachkommastellen', () => {
    const bill = parseQrBill(qrBillPayload({ amount: '50', separator: '\n' }));
    expect(bill?.amount).toBe(5000);
    expect(parseQrBill(qrBillPayload({ amount: '12.5' }))?.amount).toBe(1250);
  });

  it('lässt den Betrag leer, wenn die Rechnung keinen vorgibt', () => {
    expect(parseQrBill(qrBillPayload({ amount: '' }))?.amount).toBeUndefined();
  });

  it('erkennt Euro-Rechnungen', () => {
    expect(parseQrBill(qrBillPayload({ currency: 'EUR' }))?.currency).toBe('EUR');
  });

  it('lehnt andere Inhalte und unvollständige Daten ab', () => {
    expect(parseQrBill('https://example.com')).toBeNull();
    expect(parseQrBill(qrBillPayload().replace('EPD', 'XXX'))).toBeNull();
    expect(parseQrBill(qrBillPayload({ currency: 'USD' }))).toBeNull();
    expect(parseQrBill(qrBillPayload().replace('0200', '0100'))).toBeNull();
  });
});

describe('classifyQr', () => {
  it('unterscheidet Rechnung, Link und sonstigen Inhalt', () => {
    expect(classifyQr(qrBillPayload()).kind).toBe('bill');
    expect(classifyQr(' https://beleg.example.ch/abc ')).toEqual({
      kind: 'url',
      url: 'https://beleg.example.ch/abc',
    });
    expect(classifyQr('12345')).toEqual({ kind: 'other', text: '12345' });
  });
});
