import { describe, expect, it } from 'vitest';

import { emptyTaxDraft, parsePercent, taxTerms, transferTerms } from './billTerms';

describe('parsePercent', () => {
  it('reads whole and decimal percentages', () => {
    expect(parsePercent('7', 25)).toBe(0.07);
    expect(parsePercent('7,5', 25)).toBe(0.075);
    expect(parsePercent('12.25', 25)).toBe(0.1225);
    expect(parsePercent('0', 25)).toBe(0);
  });

  it('refuses text, three decimals and anything above the ceiling', () => {
    expect(parsePercent('siete', 25)).toBeNull();
    expect(parsePercent('7,555', 25)).toBeNull();
    expect(parsePercent('25,01', 25)).toBeNull();
    expect(parsePercent('-1', 25)).toBeNull();
  });
});

describe('taxTerms', () => {
  it('keeps only the taxes the player changes', () => {
    expect(taxTerms({ ...emptyTaxDraft, vat: '7', minimum_wage: '5' })).toEqual({
      vat: 0.07,
      minimum_wage: 500,
    });
    expect(taxTerms({ ...emptyTaxDraft, minimum_wage: '0' })).toEqual({ minimum_wage: 0 });
  });

  it('is null when nothing changes or a field is invalid', () => {
    expect(taxTerms(emptyTaxDraft)).toBeNull();
    expect(taxTerms({ ...emptyTaxDraft, tariff: '60' })).toBeNull();
    expect(taxTerms({ ...emptyTaxDraft, vat: '5', minimum_wage: 'mucho' })).toBeNull();
  });
});

describe('transferTerms', () => {
  it('needs a country and a positive amount', () => {
    expect(transferTerms('BRA', '40')).toEqual({ country_code: 'BRA', amount: 4000 });
    expect(transferTerms(null, '40')).toBeNull();
    expect(transferTerms('BRA', '0')).toBeNull();
  });
});
