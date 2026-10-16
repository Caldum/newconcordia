import { describe, expect, it } from 'vitest';

import { describeGoldPrice, goldAmount } from './goldPrice';

describe('goldAmount', () => {
  it('writes whole amounts without decimals', () => {
    expect(goldAmount(5000, 'es')).toBe('50');
    expect(goldAmount(1250, 'es')).toBe('12,50');
  });
});

describe('describeGoldPrice', () => {
  it('splits like the database, rounding the country down', () => {
    expect(
      describeGoldPrice(
        {
          key: 'party_list',
          category: 'politics',
          price: 1001,
          beneficiary: 'party_country',
          country_share_bp: 5000,
        },
        'en',
      ),
    ).toEqual({ price: '10.01', country: '5', game: '5.01', shared: true });
  });

  it('gives nothing to a country when the state pays', () => {
    expect(
      describeGoldPrice(
        {
          key: 'war_authorization',
          category: 'war',
          price: 5000,
          beneficiary: 'none',
          country_share_bp: 0,
        },
        'es',
      ),
    ).toEqual({ price: '50', country: '0', game: '50', shared: false });
  });
});
