// Prints the centroid (latitude, longitude) of every region in play, from world-regions.json, as SQL rows for the
// travel distances (ADR 0042). Run from the repository root: node data/map/scripts/region_centroids.mjs
//
// The shapes mix islands and mainland in rings of either winding, so the centroid is planar: every ring counts as
// land, weighted by its area. Longitudes are unwrapped around each ring's first point, so shapes that cross the
// antimeridian (the Aleutians) stay whole. At region scale the planar error is a few kilometres.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
const { feature } = require('topojson-client');

const topology = JSON.parse(readFileSync(new URL('../world-regions.json', import.meta.url), 'utf8'));
const regions = feature(topology, topology.objects.regions).features.filter((region) =>
  /^[A-Z]{3}-[0-9]{2}$/.test(String(region.id)),
);

function rings(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flat();
}

function unwrap(ring) {
  const base = ring[0][0];
  return ring.map(([lon, lat]) => [lon - 360 * Math.round((lon - base) / 360), lat]);
}

function centroid(region) {
  let area = 0;
  let x = 0;
  let y = 0;
  for (const ring of rings(region.geometry).map(unwrap)) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const cross = x0 * y1 - x1 * y0;
      a += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    if (a === 0) continue;
    const ringArea = Math.abs(a / 2);
    area += ringArea;
    x += (cx / (3 * a)) * ringArea;
    y += (cy / (3 * a)) * ringArea;
  }
  const lon = ((((x / area + 180) % 360) + 360) % 360) - 180;
  return [y / area, lon];
}

const rows = regions
  .map((region) => {
    const [lat, lon] = centroid(region);
    return `  ('${region.id}', ${lat.toFixed(3)}, ${lon.toFixed(3)})`;
  })
  .sort();
console.log(rows.join(',\n'));
console.error(`${rows.length} regions`);
