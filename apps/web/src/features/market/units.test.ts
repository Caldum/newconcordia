import { describe, expect, it } from 'vitest';

import { parseUnits } from './units';

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
