import { describe, expect, it } from 'vitest';

import { describeState } from './describeState';

const copy = { on: 'encendido', off: 'apagado' };

describe('describeState', () => {
  it('says the state and the day it applies', () => {
    expect(describeState({ is_active: false, apply_on: '2026-10-10' }, copy, 'es')).toBe(
      'apagado, 10 de octubre de 2026',
    );
  });

  it('names any other value, cutting long texts', () => {
    expect(
      describeState(
        { price: 6000, country_share_bp: 4000, reason: 'Más partidos serios' },
        copy,
        'es',
      ),
    ).toBe('price: 6000, country_share_bp: 4000, reason: Más partidos serios');
    expect(describeState({ note: 'x'.repeat(70) }, copy, 'es')).toBe(`note: ${'x'.repeat(60)}…`);
  });

  it('shows a dash for nothing', () => {
    expect(describeState(null, copy, 'es')).toBe('—');
    expect(describeState({}, copy, 'es')).toBe('—');
  });
});
