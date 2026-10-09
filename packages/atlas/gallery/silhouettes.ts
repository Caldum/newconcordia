// Path data of a few kit silhouettes, read from the original SVG files for the gallery only.
import argentinaRegions from '../../../docs/design/assets/silhouettes/argentina-region-buenos-aires.svg?raw';
import cuyo from '../../../docs/design/assets/silhouettes/region-cuyo.svg?raw';
import uruguay from '../../../docs/design/assets/silhouettes/uruguay-inactive.svg?raw';

function read(markup: string) {
  const svg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
  const shapes = [...svg.querySelectorAll('path')].map((path) => ({
    d: path.getAttribute('d') ?? '',
    highlighted: path.getAttribute('fill') === '#2C7FBF',
  }));
  return { viewBox: svg.getAttribute('viewBox') ?? '0 0 100 100', shapes };
}

export const cuyoSilhouette = read(cuyo);
export const argentinaSilhouette = read(argentinaRegions);
export const uruguaySilhouette = read(uruguay);
