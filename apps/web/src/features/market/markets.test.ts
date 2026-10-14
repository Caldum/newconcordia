import { describe, expect, it } from 'vitest';

import { licensableMarkets, tradableMarkets } from './markets';

describe('tradableMarkets', () => {
  it('puts the own market first and adds the licensed ones', () => {
    expect(tradableMarkets('ARG', ['BRA', 'CHL'])).toEqual(['ARG', 'BRA', 'CHL']);
  });

  it('never lists the own market twice', () => {
    expect(tradableMarkets('ARG', ['ARG'])).toEqual(['ARG']);
  });
});

describe('licensableMarkets', () => {
  const countries = [
    { code: 'ARG', is_active: true },
    { code: 'BRA', is_active: true },
    { code: 'CHL', is_active: true },
    { code: 'URY', is_active: false },
  ];

  it('offers the countries in play that are not the own one nor already licensed', () => {
    expect(licensableMarkets(countries, 'ARG', ['CHL'])).toEqual(['BRA']);
  });
});
