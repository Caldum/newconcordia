import { describe, expect, it } from 'vitest';

import { amountInput, parseAmount } from './amount';

describe('parseAmount', () => {
  it('reads units with a comma or a point and up to two decimals, into hundredths', () => {
    expect(parseAmount('12,50')).toBe(1250);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount(' 7 ')).toBe(700);
    expect(parseAmount('0,01')).toBe(1);
  });

  it('refuses what it cannot read for sure', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-3')).toBeNull();
    expect(parseAmount('12,505')).toBeNull();
    expect(parseAmount('1.240,50')).toBeNull();
    expect(parseAmount('doce')).toBeNull();
    expect(parseAmount('99999999999999')).toBeNull();
  });
});

describe('amountInput', () => {
  it('writes hundredths back as something parseAmount reads', () => {
    expect(amountInput(4200, 'es')).toBe('42,00');
    expect(amountInput(424250, 'en')).toBe('4242.50');
    expect(parseAmount(amountInput(424250, 'es'))).toBe(424250);
  });
});
