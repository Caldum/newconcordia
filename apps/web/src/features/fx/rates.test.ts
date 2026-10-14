import { describe, expect, it } from 'vitest';

import { fxCurrency, fxLock } from './rates';

describe('fxCurrency', () => {
  it('converts GOLD at a price per GOLD, rounding the currency down', () => {
    expect(fxCurrency(400, 5000)).toBe(20000);
    expect(fxCurrency(333, 5101)).toBe(16986);
    expect(fxCurrency(167, 5101)).toBe(8518);
  });
});

describe('fxLock', () => {
  it('locks the GOLD for sale, or the currency to pay rounded up', () => {
    expect(fxLock('sell_gold', 1000, 5000)).toBe(1000);
    expect(fxLock('buy_gold', 500, 5101)).toBe(25505);
  });
});
