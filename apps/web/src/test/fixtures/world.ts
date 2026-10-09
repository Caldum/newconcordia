import type { Country, Region, World } from '../../features/world/useWorld';

export const countryRows: Country[] = [
  {
    code: 'ARG',
    iso2: 'AR',
    name_es: 'Argentina',
    name_en: 'Argentina',
    official_name_es: 'República Argentina',
    official_name_en: 'Argentine Republic',
    color: '#6CACE4',
    is_active: true,
  },
  {
    code: 'ESP',
    iso2: 'ES',
    name_es: 'España',
    name_en: 'Spain',
    official_name_es: 'Reino de España',
    official_name_en: 'Kingdom of Spain',
    color: '#D0453A',
    is_active: true,
  },
  {
    code: 'URY',
    iso2: 'UY',
    name_es: 'Uruguay',
    name_en: 'Uruguay',
    official_name_es: null,
    official_name_en: null,
    color: null,
    is_active: false,
  },
];

export const regionRows: Region[] = [
  {
    code: 'ARG-01',
    name: 'Buenos Aires',
    home_country_code: 'ARG',
    owner_country_code: 'ARG',
    is_enabled: true,
  },
  {
    code: 'ARG-05',
    name: 'Cuyo',
    home_country_code: 'ARG',
    owner_country_code: 'ESP',
    is_enabled: true,
  },
  {
    code: 'ESP-03',
    name: 'Madrid',
    home_country_code: 'ESP',
    owner_country_code: 'ESP',
    is_enabled: true,
  },
  {
    code: 'ESP-07',
    name: 'Canarias',
    home_country_code: 'ESP',
    owner_country_code: 'ESP',
    is_enabled: false,
  },
];

export const world: World = {
  countries: new Map(countryRows.map((country) => [country.code, country])),
  regions: new Map(regionRows.map((region) => [region.code, region])),
};
