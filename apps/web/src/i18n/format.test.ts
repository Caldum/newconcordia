import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  pluralCategory,
} from './format';

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

describe('dates on game time', () => {
  it('shows the GMT−3 date, not the browser one', () => {
    // 01:30 UTC on October 9 is still October 8 in the game.
    expect(formatDate('2026-10-09T01:30:00Z', 'es')).toBe('8 de octubre de 2026');
    expect(formatDate('2026-10-09T01:30:00Z', 'en')).toBe('October 8, 2026');
  });

  it('shows date and time for deadlines', () => {
    expect(formatDateTime('2026-10-11T18:00:00Z', 'es')).toBe('11 de octubre a las 15:00');
    expect(formatDateTime('2026-10-11T18:00:00Z', 'en')).toBe('October 11 at 3:00 PM');
  });
});

describe('money', () => {
  it('shows hundredths with two decimals in each locale', () => {
    expect(formatMoney(3845000, 'es')).toBe('38.450,00');
    expect(formatMoney(3845000, 'en')).toBe('38,450.00');
    expect(formatMoney(504, 'es')).toBe('5,04');
  });

  it('shows whole units in tight places, never rounding up what the player does not have', () => {
    expect(formatMoney(3844999, 'es', { whole: true })).toBe('38.449');
    expect(formatMoney(124000, 'en', { whole: true })).toBe('1,240');
  });

  it('signs movements with a real minus sign', () => {
    expect(formatMoney(4200, 'es', { signed: true })).toBe('+42,00');
    expect(formatMoney(-504, 'es', { signed: true })).toBe('−5,04');
    expect(formatMoney(-504, 'en', { signed: true })).toBe('−5.04');
  });
});
