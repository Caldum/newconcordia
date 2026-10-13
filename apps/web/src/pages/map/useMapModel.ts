import { useCallback, useMemo } from 'react';

import { borderPaths, buildShapes } from '../../features/map/geometry';
import { mapSearchOptions, playableOwner } from '../../features/map/ownership';
import { useTopology } from '../../features/map/useTopology';
import { useCountryName } from '../../features/world/useNames';
import { useWorld } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Everything the map draws and searches: geometry, ownership, borders and search options. */
export function useMapModel() {
  const copy = useMessages(messages);
  const topology = useTopology();
  const world = useWorld();
  const countryName = useCountryName();
  const worldData = world.data;

  const shapes = useMemo(() => (topology.data ? buildShapes(topology.data) : []), [topology.data]);
  const provinces = useMemo(
    () => new Map(shapes.map((shape) => [shape.id, shape.provinces])),
    [shapes],
  );
  const ownerOf = useCallback((shapeId: string) => playableOwner(worldData, shapeId), [worldData]);
  const borders = useMemo(
    () =>
      topology.data
        ? borderPaths(topology.data, ownerOf)
        : { countryBorders: '', regionBorders: '' },
    [topology.data, ownerOf],
  );
  const searchOptions = worldData
    ? mapSearchOptions(worldData, countryName, {
        country: copy.countryOption,
        region: copy.regionOption,
      })
    : [];

  return {
    world: worldData,
    shapes,
    borders,
    ownerOf,
    countryName,
    searchOptions,
    provincesOf: (code: string) => provinces.get(code) ?? [],
    /** A shape of the country, to bring into view when the country is chosen. */
    firstShapeOf: (countryCode: string) =>
      shapes.find((shape) => ownerOf(shape.id) === countryCode)?.id ?? null,
    ready: topology.data !== undefined && worldData !== undefined,
    failed: topology.isError || world.isError,
    retry: () => {
      if (topology.isError) void topology.refetch();
      if (world.isError) void world.refetch();
    },
  };
}

export type MapModel = ReturnType<typeof useMapModel>;
