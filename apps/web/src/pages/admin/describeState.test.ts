import { describe, expect, it } from 'vitest';

import { describeState } from './describeState';

const copy = { on: 'encendido', off: 'apagado' };

describe('describeState', () => {
  it('says the state and the day it applies', () => {
    expect(describeState({ is_active: false, apply_on: '2026-10-10' }, copy, 'es')).toBe(
      'apagado, 10 de octubre de 2026',
    );
  });

  it('shows a dash for nothing', () => {
    expect(describeState(null, copy, 'es')).toBe('—');
    expect(describeState({}, copy, 'es')).toBe('—');
  });
});
