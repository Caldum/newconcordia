// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readTokens, renderTokensCss } from './build-tokens.js';

const generated = readFileSync(
  fileURLToPath(new URL('../src/tokens.css', import.meta.url)),
  'utf8',
);

describe('tokens.css', () => {
  it('is in sync with docs/design/atlas/tokens.json (run `pnpm --filter @concordia/atlas tokens`)', () => {
    expect(generated).toBe(renderTokensCss(readTokens()));
  });

  it('exposes colors, spacing, radii, shadows and sizes as custom properties', () => {
    expect(generated).toContain('--sea: #E4EBF0;');
    expect(generated).toContain('--ink: #13202E;');
    expect(generated).toContain('--country-esp: #D0453A;');
    expect(generated).toContain('--space-6: 24px;');
    expect(generated).toContain('--radius-l: 8px;');
    expect(generated).toContain('--panel-border: inset 0 0 0 1px #D2DAE1;');
    expect(generated).toContain('--touch-primary: 56px;');
  });

  it('exposes every type style with size, line height, weight and width', () => {
    expect(generated).toContain('--font-archivo: "Archivo", system-ui, sans-serif;');
    expect(generated).toContain('--title-1-font-size: 44px;');
    expect(generated).toContain('--title-1-line-height: 46px;');
    expect(generated).toContain('--title-1-font-weight: 800;');
    expect(generated).toContain('--title-1-font-stretch: 112%;');
    expect(generated).toContain('--score-xl-font-stretch: 124%;');
    expect(generated).toContain('--place-font-style: italic;');
  });

  it('fails loudly when a type style has no declared width', () => {
    const tokens = readTokens();
    const broken = structuredClone(tokens);
    broken.type.groups[0]?.styles.push({
      name: 'mystery',
      fontSize: '10px',
      lineHeight: '12px',
      fontWeight: 400,
      usage: '',
      sample: '',
    });
    expect(() => renderTokensCss(broken)).toThrow(/mystery/);
  });
});
