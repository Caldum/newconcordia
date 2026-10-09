import { describe, expect, it } from 'vitest';

import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Camila Ríos')).toBe('CR');
    expect(initials('Jean-Luc Picard Dupont')).toBe('JP');
  });

  it('works with one word and keeps accented letters whole', () => {
    expect(initials('Ñandú')).toBe('Ñ');
    expect(initials('élise martin')).toBe('ÉM');
  });
});
