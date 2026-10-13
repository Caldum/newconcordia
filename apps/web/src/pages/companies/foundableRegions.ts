import type { RegionResource, ResourceCategory } from '../../features/world/resources';
import type { Region, World } from '../../features/world/useWorld';

/**
 * Where a company can be founded: enabled regions of countries in play, the player's own country first;
 * an extractor only where a resource of its category exists (spec section 5).
 */
export function foundableRegions(
  world: World,
  resources: ReadonlyMap<string, readonly RegionResource[]>,
  company: { extractor: boolean; category: ResourceCategory },
  homeCountry: string,
): Region[] {
  return [...world.regions.values()]
    .filter(
      (region) => region.is_enabled && world.countries.get(region.owner_country_code)?.is_active,
    )
    .filter(
      (region) =>
        !company.extractor ||
        (resources.get(region.code) ?? []).some(
          (resource) => resource.category === company.category,
        ),
    )
    .sort(
      (a, b) =>
        Number(b.owner_country_code === homeCountry) -
          Number(a.owner_country_code === homeCountry) ||
        a.owner_country_code.localeCompare(b.owner_country_code) ||
        a.name.localeCompare(b.name),
    );
}
