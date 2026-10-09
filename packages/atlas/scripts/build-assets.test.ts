// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildFlags, buildIcons, buildLogos } from './build-assets.js';

function generated(file: string) {
  return readFileSync(fileURLToPath(new URL(`../src/${file}`, import.meta.url)), 'utf8');
}

describe('generated assets (run `pnpm --filter @concordia/atlas assets` after changing a source)', () => {
  it('icons are in sync with docs/design/assets/icons', () => {
    expect(generated('icons.generated.ts')).toBe(buildIcons());
  });

  it('flags are in sync with their sources', () => {
    expect(generated('flags.generated.ts')).toBe(buildFlags());
  });

  it('logos are in sync with docs/design/assets/logos', () => {
    expect(generated('logos.generated.ts')).toBe(buildLogos());
  });

  it('covers the 58 icons and the 13 countries in play plus Uruguay', () => {
    expect(buildIcons().match(/^ {2}\w+: \[/gm)).toHaveLength(58);
    const flags = buildFlags();
    for (const code of [
      'ARG',
      'BRA',
      'CHL',
      'PRY',
      'MEX',
      'USA',
      'CAN',
      'ESP',
      'PRT',
      'FRA',
      'ITA',
      'DEU',
      'GBR',
      'URY',
    ]) {
      expect(flags).toContain(`  ${code}: [`);
    }
  });
});
