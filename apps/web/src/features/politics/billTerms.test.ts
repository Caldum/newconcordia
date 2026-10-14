import { describe, expect, it } from 'vitest';

import {
  allocationTerms,
  billTerms,
  emptyBillDraft,
  emptyTaxDraft,
  issuanceTerms,
  parsePercent,
  taxTerms,
  transferTerms,
} from './billTerms';

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

describe('allocationTerms', () => {
  it('takes Gold, Credit or both', () => {
    expect(allocationTerms('health', '30', '500')).toEqual({
      ministry: 'health',
      gold: 3000,
      credit: 50000,
    });
    expect(allocationTerms('defense', '', '10,5')).toEqual({
      ministry: 'defense',
      gold: 0,
      credit: 1050,
    });
  });

  it('is null with nothing or an invalid amount', () => {
    expect(allocationTerms('health', '', '')).toBeNull();
    expect(allocationTerms('health', 'diez', '')).toBeNull();
  });
});

describe('issuanceTerms', () => {
  it('needs a positive amount', () => {
    expect(issuanceTerms('2000')).toEqual({ amount: 200000 });
    expect(issuanceTerms('0')).toBeNull();
  });
});

describe('billTerms', () => {
  it('reads the fields of each kind', () => {
    expect(billTerms('ordinary', emptyBillDraft)).toEqual({});
    expect(billTerms('war_authorization', { ...emptyBillDraft, country: 'BRA' })).toEqual({
      country_code: 'BRA',
    });
    expect(billTerms('war_authorization', emptyBillDraft)).toBeNull();
    expect(billTerms('enemy_designation', { ...emptyBillDraft, country: '' })).toEqual({});
    expect(billTerms('embargo', { ...emptyBillDraft, country: 'BRA', embargo: 'arms' })).toEqual({
      country_code: 'BRA',
      kind: 'arms',
    });
    expect(billTerms('peace', { ...emptyBillDraft, country: 'BRA' })).toEqual({
      country_code: 'BRA',
    });
    expect(billTerms('central_bank_allocation', { ...emptyBillDraft, amount: '40' })).toEqual({
      gold: 4000,
      credit: 0,
    });
    expect(billTerms('currency_issuance', { ...emptyBillDraft, amount: '5' })).toEqual({
      amount: 500,
    });
    expect(billTerms('gold_transfer', { ...emptyBillDraft, amount: '5' })).toBeNull();
    expect(
      billTerms('ministry_allocation', { ...emptyBillDraft, ministry: 'defense', credit: '5' }),
    ).toEqual({
      ministry: 'defense',
      gold: 0,
      credit: 500,
    });
  });
});
