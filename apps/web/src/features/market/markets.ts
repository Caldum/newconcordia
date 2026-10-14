interface CountryLike {
  code: string;
  is_active: boolean;
}

/** The markets a player can trade in: their own first, then the ones they hold a license for. */
export function tradableMarkets(own: string, licensed: readonly string[]): string[] {
  return [own, ...licensed.filter((code) => code !== own)];
}

/** Countries in play whose market the player could buy a license for, in the given order. */
export function licensableMarkets(
  countries: readonly CountryLike[],
  own: string,
  licensed: readonly string[],
): string[] {
  const held = new Set(licensed);
  return countries
    .filter((country) => country.is_active && country.code !== own && !held.has(country.code))
    .map((country) => country.code);
}
