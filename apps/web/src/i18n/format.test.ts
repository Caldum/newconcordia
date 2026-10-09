import { describe, expect, it } from 'vitest';

import { formatNumber, formatPercent, pluralCategory } from './format';

describe('formatNumber', () => {
  it('groups thousands in Spanish even with four digits', () => {
    expect(formatNumber(1840, 'es')).toBe('1.840');
    expect(formatNumber(38450, 'es')).toBe('38.450');
  });

  it('uses a decimal comma in Spanish and a decimal point in English', () => {
    expect(formatNumber(36.96, 'es', { minimumFractionDigits: 2 })).toBe('36,96');
    expect(formatNumber(36.96, 'en', { minimumFractionDigits: 2 })).toBe('36.96');
    expect(formatNumber(1840, 'en')).toBe('1,840');
  });
});

describe('formatPercent', () => {
  it('formats ratios per locale', () => {
    expect(formatPercent(0.58, 'es')).toBe('58\u00a0%');
    expect(formatPercent(0.58, 'en')).toBe('58%');
  });
});

describe('pluralCategory', () => {
  it('follows each language rules', () => {
    expect(pluralCategory(1, 'es')).toBe('one');
    expect(pluralCategory(2, 'en')).toBe('other');
  });
});
