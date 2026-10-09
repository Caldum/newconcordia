// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { borderPaths, buildShapes, MAP_HEIGHT, MAP_WIDTH } from './geometry';
import type { WorldTopology } from './geometry';

const topology = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../../../data/map/world-regions.json', import.meta.url)),
    'utf8',
  ),
) as WorldTopology;

describe('buildShapes', () => {
  const shapes = buildShapes(topology);

  it('projects every shape with its fixed id', () => {
    expect(shapes.filter((shape) => shape.isRegion)).toHaveLength(78);
    const cuyo = shapes.find((shape) => shape.id === 'ARG-05');
    expect(cuyo?.homeCountry).toBe('ARG');
    expect(cuyo?.d.startsWith('M')).toBe(true);
    expect(shapes.find((shape) => shape.id === 'URY')?.isRegion).toBe(false);
  });

  it('keeps shapes inside the map canvas', () => {
    const cuyo = shapes.find((shape) => shape.id === 'ARG-05');
    const [[x0, y0], [x1, y1]] = cuyo?.bounds ?? [
      [0, 0],
      [0, 0],
    ];
    expect(x0).toBeGreaterThan(0);
    expect(x1).toBeLessThan(MAP_WIDTH);
    expect(y0).toBeGreaterThan(0);
    expect(y1).toBeLessThan(MAP_HEIGHT);
  });
});

describe('borderPaths', () => {
  it('draws region lines only between regions of the same owner', () => {
    const allArgentine = borderPaths(topology, (id) => (id.startsWith('ARG-') ? 'ARG' : undefined));
    const cuyoTaken = borderPaths(topology, (id) =>
      id === 'ARG-05' ? 'ESP' : id.startsWith('ARG-') ? 'ARG' : undefined,
    );
    expect(allArgentine.regionBorders.length).toBeGreaterThan(0);
    // When Cuyo changes hands its borders move from the region lines to the country borders.
    expect(cuyoTaken.regionBorders.length).toBeLessThan(allArgentine.regionBorders.length);
    expect(cuyoTaken.countryBorders.length).toBeGreaterThan(allArgentine.countryBorders.length);
  });

  it('draws nothing for a world without countries in play', () => {
    expect(borderPaths(topology, () => undefined)).toEqual({
      countryBorders: '',
      regionBorders: '',
    });
  });
});
