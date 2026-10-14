import { describe, expect, it } from 'vitest';

import { ministryOfLabel, movementKind } from './movements';

describe('movementKind', () => {
  it('names known kinds and folds the rest', () => {
    expect(movementKind('ministry_payment')).toBe('ministry_payment');
    expect(movementKind('something_new')).toBe('other');
  });
});

describe('ministryOfLabel', () => {
  it('reads the ministry of an institutional label', () => {
    expect(ministryOfLabel('ARG:health')).toBe('health');
    expect(ministryOfLabel('Elena Sosa')).toBeNull();
    expect(ministryOfLabel(null)).toBeNull();
  });
});
