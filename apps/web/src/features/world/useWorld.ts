import { queryOptions, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';

const countrySchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  iso2: z.string().nullable(),
  name_es: z.string(),
  name_en: z.string(),
  official_name_es: z.string().nullable(),
  official_name_en: z.string().nullable(),
  color: z.string().nullable(),
  is_active: z.boolean(),
});

const regionSchema = z.object({
  code: z.string().regex(/^[A-Z]{3}-\d{2}$/),
  name: z.string(),
  home_country_code: z.string(),
  owner_country_code: z.string(),
  is_enabled: z.boolean(),
});

export type Country = z.infer<typeof countrySchema>;
export type Region = z.infer<typeof regionSchema>;

export interface World {
  countries: ReadonlyMap<string, Country>;
  regions: ReadonlyMap<string, Region>;
}

export async function fetchWorld(): Promise<World> {
  const [countries, regions] = await Promise.all([
    supabase.rpc('list_countries'),
    supabase.rpc('list_regions'),
  ]);
  if (countries.error) throw countries.error;
  if (regions.error) throw regions.error;
  const parsedCountries = z.array(countrySchema).parse(countries.data);
  const parsedRegions = z.array(regionSchema).parse(regions.data);
  return {
    countries: new Map(parsedCountries.map((country) => [country.code, country])),
    regions: new Map(parsedRegions.map((region) => [region.code, region])),
  };
}

export const worldQuery = queryOptions({
  queryKey: ['world'],
  queryFn: fetchWorld,
  staleTime: 60_000,
});

/** Countries and regions with their current owners, as the database reports them. */
export function useWorld() {
  return useQuery(worldQuery);
}
