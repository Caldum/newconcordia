import { describe, expect, it } from 'vitest';

import { lockedAmount, parseUnits } from './units';

describe('parseUnits', () => {
  it('reads whole units', () => {
    expect(parseUnits(' 12 ')).toBe(12);
  });

  it('refuses fractions, signs and more than six digits', () => {
    expect(parseUnits('1.5')).toBe(0);
    expect(parseUnits('-3')).toBe(0);
    expect(parseUnits('1000000')).toBe(0);
  });
});

describe('lockedAmount', () => {
  it('locks the limit times the units', () => {
    expect(lockedAmount(1300, 10)).toBe(13000);
  });

  it('locks nothing without a valid limit', () => {
    expect(lockedAmount(null, 10)).toBe(0);
  });
});
