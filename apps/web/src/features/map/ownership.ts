import type { World } from '../world/useWorld';

/**
 * The country that colors a shape: the owner of an enabled region whose home country is in play.
 * Disabled regions and regions of countries out of play are gray and inert (undefined).
 */
export function playableOwner(world: World | undefined, shapeId: string): string | undefined {
  const region = world?.regions.get(shapeId);
  if (!region?.is_enabled) return undefined;
  if (!world?.countries.get(region.home_country_code)?.is_active) return undefined;
  return region.owner_country_code;
}

export interface MapSearchOption {
  id: string;
  name: string;
  kind: string;
}

/** What the search finds: countries in play, then every region with its home country. */
export function mapSearchOptions(
  world: World,
  countryName: (code: string) => string,
  kinds: { country: string; region: (country: string) => string },
): MapSearchOption[] {
  const countries = [...world.countries.values()]
    .filter((country) => country.is_active)
    .map((country) => ({ id: country.code, name: countryName(country.code), kind: kinds.country }));
  const regions = [...world.regions.values()].map((region) => ({
    id: region.code,
    name: region.name,
    kind: kinds.region(countryName(region.home_country_code)),
  }));
  return [...countries, ...regions];
}
