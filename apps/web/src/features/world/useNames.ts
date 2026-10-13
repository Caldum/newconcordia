import { useLocale } from '../../i18n';

import { countryName } from './names';
import { useWorld } from './useWorld';

/** Country name by code in the player's language; the code itself until the world loads. */
export function useCountryName(): (code: string) => string {
  const { locale } = useLocale();
  const world = useWorld();
  return (code) => {
    const country = world.data?.countries.get(code);
    return country ? countryName(country, locale) : code;
  };
}

/** Region name by code; the code itself until the world loads. */
export function useRegionName(): (code: string) => string {
  const world = useWorld();
  return (code) => world.data?.regions.get(code)?.name ?? code;
}
