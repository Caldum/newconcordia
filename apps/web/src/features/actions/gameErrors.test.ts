import { describe, expect, it } from 'vitest';

import { act, errorCode, problemText } from './gameErrors';

describe('game errors', () => {
  it('returns the data of a successful call and throws a failed one', async () => {
    await expect(act(Promise.resolve({ data: 3, error: null }))).resolves.toBe(3);
    await expect(
      act(Promise.resolve({ data: null, error: { message: 'insufficient_funds' } })),
    ).rejects.toEqual({ message: 'insufficient_funds' });
  });

  it('keeps only stable codes', () => {
    expect(errorCode({ message: 'insufficient_funds' })).toBe('insufficient_funds');
    expect(errorCode({ message: 'Failed to fetch' })).toBe('other');
    expect(errorCode(null)).toBe('other');
  });

  it('finds the copy of a code, or the generic one', () => {
    const copy = { error_other: 'Algo falló.', error_food_limit: 'Demasiada comida.' };
    expect(problemText(copy, 'food_limit')).toBe('Demasiada comida.');
    expect(problemText(copy, 'unknown_code')).toBe('Algo falló.');
  });
});
