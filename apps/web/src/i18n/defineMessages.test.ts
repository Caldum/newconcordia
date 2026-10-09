import { describe, expect, it } from 'vitest';

import { defineMessages } from './defineMessages';

describe('defineMessages', () => {
  it('returns the catalog unchanged', () => {
    const catalog = defineMessages({ es: { title: 'Mapa' }, en: { title: 'Map' } });
    expect(catalog.en.title).toBe('Map');
  });

  it('rejects incomplete or mismatched translations at compile time', () => {
    defineMessages({
      es: { title: 'Mapa', count: (n: number) => `${n} regiones` },
      // @ts-expect-error: the English catalog is missing `count`.
      en: { title: 'Map' },
    });
    defineMessages({
      es: { count: (n: number) => `${n} regiones` },
      // @ts-expect-error: `count` must be a function with the same parameters.
      en: { count: 'regions' },
    });
    expect(true).toBe(true);
  });
});
