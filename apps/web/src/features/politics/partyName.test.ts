import { describe, expect, it } from 'vitest';

import { partyName } from './partyName';

describe('partyName', () => {
  it('trims the name', () => {
    expect(partyName('  Frente Federal ')).toBe('Frente Federal');
  });

  it('needs 3 to 40 characters', () => {
    expect(partyName('FF')).toBeNull();
    expect(partyName('x'.repeat(41))).toBeNull();
    expect(partyName('x'.repeat(40))).toBe('x'.repeat(40));
  });
});
