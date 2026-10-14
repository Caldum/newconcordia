import { useCurrentCitizen } from '../shell/CurrentCitizen';

import { useCountryName } from './useNames';
import { useWorld } from './useWorld';

/** Countries in play other than the player's, by name: the targets of transfers, wars and treaties. */
export function useOtherCountries(): string[] {
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const world = useWorld();
  return [...(world.data?.countries.values() ?? [])]
    .filter((country) => country.is_active && country.code !== citizen.country_code)
    .map((country) => country.code)
    .sort((a, b) => countryName(a).localeCompare(countryName(b)));
}
