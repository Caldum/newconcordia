import { describe, expect, it } from 'vitest';

import { messages } from './messages';

describe('map messages', () => {
  it('pluralizes counts in both languages', () => {
    expect(messages.es.resultCount(1)).toBe('1 resultado');
    expect(messages.es.resultCount(3)).toBe('3 resultados');
    expect(messages.en.resultCount(1)).toBe('1 result');
    expect(messages.es.regionsCount(1)).toBe('1 región');
    expect(messages.en.regionsCount(2)).toBe('2 regions');
    expect(messages.en.regionsCount(1)).toBe('1 region');
  });

  it('fills names into the sentences', () => {
    expect(messages.en.occupied('Spain', 'Argentina')).toBe(
      'Occupied. Spain took it from Argentina.',
    );
    expect(messages.en.underControl('Spain')).toBe("Under Spain's control.");
    expect(messages.es.ownRegions(5, 6)).toBe('5 de 6 propias');
    expect(messages.en.regionOf('Chile')).toBe('Region of Chile');
    expect(messages.en.noResults('zz')).toBe('No country or region matches “zz”.');
    expect(messages.en.selected('Cuyo')).toBe('You chose Cuyo.');
    expect(messages.en.viewCountry('Spain')).toBe('Show Spain');
  });
});
