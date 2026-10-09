import { geoIdentity, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification';

/** Equirectangular canvas from −58° to 84° latitude, as the landing prototype. */
export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = (MAP_WIDTH * 142) / 360;

interface ShapeProperties {
  /** Country code. */
  c: string;
  /** Region name, only for regions of countries in play. */
  n?: string;
  /** Provinces grouped in the region. */
  p?: string[];
}

export type WorldTopology = Topology<{
  regions: GeometryCollection<ShapeProperties>;
}>;

export interface Shape {
  /** Region code (ARG-05) or, for countries not in play, the country code. */
  id: string;
  homeCountry: string;
  isRegion: boolean;
  provinces: readonly string[];
  d: string;
  /** [[x0, y0], [x1, y1]] in map units, for zooming to the shape. */
  bounds: [[number, number], [number, number]];
}

const frame = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-180, -58],
      [180, -58],
      [180, 84],
      [-180, 84],
      [-180, -58],
    ],
  ],
};

const projection = geoIdentity().reflectY(true).fitSize([MAP_WIDTH, MAP_HEIGHT], frame);
const toPath = geoPath(projection);

function shapeId(geometry: GeometryObject): string {
  return String(geometry.id);
}

function propertiesOf(geometry: GeometryObject): ShapeProperties | undefined {
  return geometry.properties as ShapeProperties | undefined;
}

/** Projects every shape once; the result is static and independent of game state. */
export function buildShapes(topology: WorldTopology): Shape[] {
  const collection = topology.objects.regions;
  return collection.geometries.map((geometry) => {
    const geo = feature(topology, geometry);
    const properties = propertiesOf(geometry);
    return {
      id: shapeId(geometry),
      homeCountry: properties?.c ?? '',
      isRegion: properties?.n !== undefined,
      provinces: properties?.p ?? [],
      d: toPath(geo) ?? '',
      bounds: toPath.bounds(geo),
    };
  });
}

/** Who owns each playable shape right now; anything absent is drawn as not in play. */
export type OwnerOf = (shapeId: string) => string | undefined;

/**
 * Border lines that depend on ownership: the outline of every country in play (its coast and its
 * frontier with other owners) and the thin lines between regions of the same owner.
 */
export function borderPaths(topology: WorldTopology, ownerOf: OwnerOf) {
  const collection = topology.objects.regions;
  const owner = (geometry: GeometryObject) => ownerOf(shapeId(geometry));

  const countryBorders = mesh(topology, collection, (a, b) => {
    const ownerA = owner(a);
    const ownerB = owner(b);
    if (ownerA === undefined && ownerB === undefined) return false;
    return a === b || ownerA !== ownerB;
  });
  const regionBorders = mesh(topology, collection, (a, b) => {
    const ownerA = owner(a);
    return a !== b && ownerA !== undefined && ownerA === owner(b);
  });
  return {
    countryBorders: toPath(countryBorders) ?? '',
    regionBorders: toPath(regionBorders) ?? '',
  };
}
