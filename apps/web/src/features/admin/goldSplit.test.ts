import { describe, expect, it } from 'vitest';

import {
  formatShare,
  goldText,
  parseGold,
  parseParamValue,
  parsePercent,
  percentText,
  splitPrice,
} from './goldSplit';

describe('splitPrice', () => {
  it('gives the country its share rounded down and the rest to the game', () => {
    expect(splitPrice(6000, 4000, 'party_country')).toEqual({ country: 2400, game: 3600 });
    expect(splitPrice(1001, 5000, 'market_country')).toEqual({ country: 500, game: 501 });
  });

  it('keeps everything for the game when the state pays', () => {
    expect(splitPrice(5000, 5000, 'none')).toEqual({ country: 0, game: 5000 });
  });
});

describe('parseGold', () => {
  it('reads whole and decimal GOLD with a comma or a point', () => {
    expect(parseGold('12')).toBe(1200);
    expect(parseGold('12,5')).toBe(1250);
    expect(parseGold(' 0.05 ')).toBe(5);
  });

  it('refuses anything else', () => {
    expect(parseGold('')).toBeNull();
    expect(parseGold('1,234')).toBeNull();
    expect(parseGold('-3')).toBeNull();
    expect(parseGold('12345678')).toBeNull();
  });
});

describe('parsePercent', () => {
  it('reads basis points up to 100 %', () => {
    expect(parsePercent('40')).toBe(4000);
    expect(parsePercent('12,25')).toBe(1225);
    expect(parsePercent('100')).toBe(10000);
    expect(parsePercent('100,01')).toBeNull();
    expect(parsePercent('abc')).toBeNull();
  });
});

describe('texts', () => {
  it('writes amounts and shares to edit and to read', () => {
    expect(goldText(1250, 'es')).toBe('12,5');
    expect(goldText(1250, 'en')).toBe('12.5');
    expect(percentText(1225, 'es')).toBe('12,25');
    expect(formatShare(4000, 'en')).toBe('40%');
    expect(formatShare(1250, 'es')).toMatch(/^12,5\s?%$/);
  });
});

describe('parseParamValue', () => {
  it('reads non-negative numbers with up to six decimals', () => {
    expect(parseParamValue('0.0001')).toBe(0.0001);
    expect(parseParamValue('200')).toBe(200);
    expect(parseParamValue('1,5')).toBe(1.5);
    expect(parseParamValue('-1')).toBeNull();
    expect(parseParamValue('1.1234567')).toBeNull();
  });
});
