import { describe, expect, it } from 'vitest';

import { purchaseTotals, saleTotals } from './totals';

describe('market totals', () => {
  it('charges the tariff on top of an import; VAT is inside the price', () => {
    expect(purchaseTotals(1300, 2, 0.05, 0.1, true)).toEqual({
      gross: 2600,
      vat: 124,
      tariff: 260,
      total: 2860,
    });
  });

  it('charges no tariff on local goods', () => {
    expect(purchaseTotals(1300, 2, 0.05, 0.1, false).total).toBe(2600);
  });

  it('gives the seller the gross minus VAT and the fee', () => {
    expect(saleTotals(1260, 10, 0.05, 0.01)).toEqual({
      gross: 12600,
      vat: 600,
      fee: 126,
      net: 11874,
    });
  });
});
