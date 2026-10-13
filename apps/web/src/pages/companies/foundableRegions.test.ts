import { describe, expect, it } from 'vitest';

import type { Country, Region, World } from '../../features/world/useWorld';

import { foundableRegions } from './foundableRegions';

function country(code: string, isActive = true): Country {
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

function region(code: string, owner: string, isEnabled = true): Region {
  return {
    code,
    name: code,
    home_country_code: owner,
    owner_country_code: owner,
    is_enabled: isEnabled,
  };
}

const world: World = {
  countries: new Map([
    ['ARG', country('ARG')],
    ['BRA', country('BRA')],
    ['URY', country('URY', false)],
  ]),
  regions: new Map([
    ['BRA-07', region('BRA-07', 'BRA')],
    ['ARG-01', region('ARG-01', 'ARG')],
    ['ARG-03', region('ARG-03', 'ARG')],
    ['ARG-09', region('ARG-09', 'ARG', false)],
    ['URY-01', region('URY-01', 'URY')],
  ]),
};

const resources = new Map([
  ['ARG-01', [{ code: 'wheat', category: 'food' as const }]],
  ['ARG-03', [{ code: 'copper', category: 'military' as const }]],
  ['BRA-07', [{ code: 'oil', category: 'military' as const }]],
  ['URY-01', [{ code: 'cattle', category: 'food' as const }]],
]);

describe('foundableRegions', () => {
  it('offers every enabled region in play to a manufacturer, the home country first', () => {
    const codes = foundableRegions(
      world,
      resources,
      { extractor: false, category: 'food' },
      'ARG',
    ).map((r) => r.code);
    expect(codes).toEqual(['ARG-01', 'ARG-03', 'BRA-07']);
  });

  it('offers an extractor only the regions with a resource of its category', () => {
    const codes = foundableRegions(
      world,
      resources,
      { extractor: true, category: 'military' },
      'BRA',
    ).map((r) => r.code);
    expect(codes).toEqual(['BRA-07', 'ARG-03']);
  });
});
