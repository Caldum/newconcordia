import { queryOptions, useQuery } from '@tanstack/react-query';

import topologyUrl from '../../../../../data/map/world-regions.json?url';

import type { WorldTopology } from './geometry';

/** The map geometry (0.9 MB): a hashed static file with an immutable cache, fetched only by the map. */
export const topologyQuery = queryOptions({
  queryKey: ['map-topology'],
  queryFn: async (): Promise<WorldTopology> => {
    const response = await fetch(topologyUrl);
    if (!response.ok) throw new Error(`Map geometry: HTTP ${response.status}`);
    return (await response.json()) as WorldTopology;
  },
  staleTime: Number.POSITIVE_INFINITY,
});

export function useTopology() {
  return useQuery(topologyQuery);
}
