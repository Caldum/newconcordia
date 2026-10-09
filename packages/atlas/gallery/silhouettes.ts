// Path data of a few kit silhouettes, read from the original SVG files for the gallery only.
import argentinaRegions from '../../../docs/design/assets/silhouettes/argentina-region-buenos-aires.svg?raw';
import cuyo from '../../../docs/design/assets/silhouettes/region-cuyo.svg?raw';
import uruguay from '../../../docs/design/assets/silhouettes/uruguay-inactive.svg?raw';

function read(svg: string) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 100 100';
  const paths = [...svg.matchAll(/<path d="([^"]+)"[^>]*fill="([^"]+)"/g)].map(
    ([, d = '', fill]) => ({
      d,
      highlighted: fill === '#2C7FBF',
    }),
  );
  return { viewBox, shapes: paths };
}

export const cuyoSilhouette = read(cuyo);
export const argentinaSilhouette = read(argentinaRegions);
export const uruguaySilhouette = read(uruguay);
