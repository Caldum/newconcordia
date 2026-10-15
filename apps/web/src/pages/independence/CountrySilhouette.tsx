import { Silhouette } from '@concordia/atlas/Silhouette';
import { useMemo } from 'react';

import { buildShapes, countryOutline } from '../../features/map/geometry';
import { useTopology } from '../../features/map/useTopology';

interface CountrySilhouetteProps {
  country: string;
  label: string;
  /** Share liberated, 0 to 1: the country's color rises from the bottom over the occupier's. */
  share: number;
}

/** The country's map, filled from the bottom as the war advances. Nothing while the geometry loads. */
export function CountrySilhouette({ country, label, share }: CountrySilhouetteProps) {
  const topology = useTopology().data;
  const outline = useMemo(
    () => (topology ? countryOutline(buildShapes(topology), country) : null),
    [topology, country],
  );
  if (!outline) return null;
  return (
    <Silhouette
      shapes={outline.shapes}
      viewBox={outline.viewBox}
      label={label}
      borders
      width={140}
      split={{
        bottomColor: `var(--country-${country.toLowerCase()}, var(--nation))`,
        topColor: 'var(--war-on-ink)',
        bottomShare: share,
      }}
    />
  );
}
