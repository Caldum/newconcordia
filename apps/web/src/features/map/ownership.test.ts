import { describe, expect, it } from 'vitest';

import type { Country, Region, World } from '../world/useWorld';

import { mapSearchOptions, playableOwner } from './ownership';

function country(code: string, isActive: boolean): Country {
  return {
    code,
    iso2: null,
    name_es: code,
    name_en: code,
    official_name_es: null,
    official_name_en: null,
    color: null,
    is_active: isActive,
  };
}

function region(code: string, home: string, owner: string, isEnabled = true): Region {
  return {
    code,
    name: `Región ${code}`,
    home_country_code: home,
    owner_country_code: owner,
    is_enabled: isEnabled,
  };
}

const world: World = {
  countries: new Map([
    ['ARG', country('ARG', true)],
    ['URY', country('URY', false)],
  ]),
  regions: new Map([
    ['ARG-01', region('ARG-01', 'ARG', 'ARG')],
    ['ARG-02', region('ARG-02', 'ARG', 'ARG', false)],
    ['URY-01', region('URY-01', 'URY', 'URY')],
  ]),
};

describe('map ownership', () => {
  it('colors an enabled region of a country in play by its owner', () => {
    expect(playableOwner(world, 'ARG-01')).toBe('ARG');
  });

  it('leaves disabled regions and countries out of play gray', () => {
    expect(playableOwner(world, 'ARG-02')).toBeUndefined();
    expect(playableOwner(world, 'URY-01')).toBeUndefined();
    expect(playableOwner(undefined, 'ARG-01')).toBeUndefined();
  });

  it('searches countries in play, then every region with its country', () => {
    const options = mapSearchOptions(world, (code) => `País ${code}`, {
      country: 'País',
      region: (name) => `Región de ${name}`,
    });
    expect(options.map((option) => option.id)).toEqual(['ARG', 'ARG-01', 'ARG-02', 'URY-01']);
    expect(options[1]).toEqual({ id: 'ARG-01', name: 'Región ARG-01', kind: 'Región de País ARG' });
  });
});
