import { describe, expect, it } from 'vitest';

import { addToList, moveUp, removeFromList } from './listDraft';

describe('list draft', () => {
  it('adds each name once, at the end', () => {
    expect(addToList(addToList(['Ana'], 'Bea'), 'Ana')).toEqual(['Ana', 'Bea']);
  });

  it('removes a name', () => {
    expect(removeFromList(['Ana', 'Bea', 'Ciro'], 'Bea')).toEqual(['Ana', 'Ciro']);
  });

  it('moves a name one place up and leaves the first alone', () => {
    expect(moveUp(['Ana', 'Bea', 'Ciro'], 'Ciro')).toEqual(['Ana', 'Ciro', 'Bea']);
    expect(moveUp(['Ana', 'Bea'], 'Ana')).toEqual(['Ana', 'Bea']);
  });
});
