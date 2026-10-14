import { describe, expect, it } from 'vitest';

import { currencyName, currencyOf } from './currency';

describe('currencyOf', () => {
  it('names the currency of a country, shared ones included', () => {
    expect(currencyOf('ARG')).toBe('ARS');
    expect(currencyOf('ESP')).toBe('EUR');
    expect(currencyOf('DEU')).toBe('EUR');
    expect(currencyOf('ECU')).toBe('USD');
    expect(currencyOf('CHL')).toBe('CLP');
  });

  it('has none for an unknown code', () => {
    expect(currencyOf('XXX')).toBeUndefined();
  });
});

describe('currencyName', () => {
  it('uses the plural for the amount', () => {
    expect(currencyName(1250, 'ARG', 'es')).toBe('pesos argentinos');
    expect(currencyName(1, 'ESP', 'es')).toBe('euro');
    expect(currencyName(2, 'USA', 'en')).toBe('US dollars');
  });

  it('is null without a currency', () => {
    expect(currencyName(5, 'XXX', 'es')).toBeNull();
  });
});
