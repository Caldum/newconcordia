import { describe, expect, it } from 'vitest';

import { countryName, officialCountryName } from './names';

const argentina = {
  code: 'ARG',
  iso2: 'AR',
  name_es: 'Argentina',
  name_en: 'Argentina',
  official_name_es: 'República Argentina',
  official_name_en: 'Argentine Republic',
  color: null,
  is_active: true,
};

describe('country names', () => {
  it('uses the player language', () => {
    expect(countryName({ name_es: 'España', name_en: 'Spain' }, 'en')).toBe('Spain');
    expect(officialCountryName(argentina, 'es')).toBe('República Argentina');
  });

  it('falls back to the short name without an official one', () => {
    expect(officialCountryName({ ...argentina, official_name_en: null }, 'en')).toBe('Argentina');
  });
});
