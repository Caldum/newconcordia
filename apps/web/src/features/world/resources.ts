import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';

const regionResourceSchema = z.object({
  region_code: z.string(),
  resource_code: z.string(),
  category: z.enum(['food', 'military', 'medical']),
});

export type ResourceCategory = z.infer<typeof regionResourceSchema>['category'];
export interface RegionResource {
  code: string;
  category: ResourceCategory;
}

/** The resources of each region (the same for everyone, fixed for the session). */
export function useRegionResources() {
  return useQuery({
    queryKey: ['region-resources'],
    staleTime: Infinity,
    queryFn: async () => {
      const byRegion = new Map<string, RegionResource[]>();
      for (const row of await rows(supabase.rpc('list_region_resources'), regionResourceSchema)) {
        const list = byRegion.get(row.region_code) ?? [];
        list.push({ code: row.resource_code, category: row.category });
        byRegion.set(row.region_code, list);
      }
      return byRegion;
    },
  });
}
