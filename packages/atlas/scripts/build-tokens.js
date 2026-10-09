// Generates src/tokens.css from docs/design/atlas/tokens.json, the only source of Atlas values.
// Run with `pnpm --filter @concordia/atlas tokens`; a test fails when the two drift apart.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tokensPath = fileURLToPath(
  new URL('../../../docs/design/atlas/tokens.json', import.meta.url),
);
const outputPath = fileURLToPath(new URL('../src/tokens.css', import.meta.url));

/**
 * tokens.json states the width (`font-stretch`) of each style only in prose, so it is declared here,
 * following the Atlas README (titles 112–122 %, figures 124 %) and the component bundle.
 * @type {Record<string, string>}
 */
const fontStretch = {
  display: '122%',
  'title-1': '112%',
  'title-2': '112%',
  'title-3': '106%',
  'score-xl': '124%',
  score: '124%',
  figure: '124%',
  'body-l': '100%',
  body: '100%',
  button: '100%',
  label: '100%',
  support: '100%',
  chip: '100%',
  'place-xl': '100%',
  place: '100%',
  'place-s': '100%',
};

/**
 * @typedef {{ name: string, value: string }} Token
 * @typedef {{ name: string, fontSize: string, lineHeight: string, fontWeight: number,
 *   letterSpacing?: string, fontStyle?: string, usage: string, sample: string }} TypeStyle
 * @typedef {{
 *   color: { tokens: Token[] },
 *   type: { families: Record<string, string>, groups: { name: string, family: string, styles: TypeStyle[] }[] },
 *   spacing: { tokens: Token[] },
 *   radius: { tokens: Token[] },
 *   shadow: { tokens: Token[] },
 *   size: { tokens: Token[] },
 * }} Tokens
 */

/** @returns {Tokens} */
export function readTokens() {
  return JSON.parse(readFileSync(tokensPath, 'utf8'));
}

/**
 * @param {Tokens} tokens
 * @returns {string}
 */
export function renderTokensCss(tokens) {
  /** @type {string[]} */
  const lines = [];
  /** @param {string} title @param {Token[]} list */
  const section = (title, list) => {
    lines.push(
      '',
      `  /* ${title} */`,
      ...list.map((token) => `  --${token.name}: ${token.value};`),
    );
  };

  section('Color', tokens.color.tokens);
  section('Spacing', tokens.spacing.tokens);
  section('Radius', tokens.radius.tokens);
  section('Shadow', tokens.shadow.tokens);
  section('Size', tokens.size.tokens);

  lines.push('', '  /* Type */');
  for (const [family, stack] of Object.entries(tokens.type.families)) {
    lines.push(`  --font-${family}: ${stack};`);
  }
  for (const group of tokens.type.groups) {
    for (const style of group.styles) {
      const stretch = fontStretch[style.name];
      if (!stretch) throw new Error(`No font-stretch declared for type style "${style.name}"`);
      const prefix = `  --${style.name}`;
      lines.push(
        `${prefix}-font-family: var(--font-${group.family});`,
        `${prefix}-font-size: ${style.fontSize};`,
        `${prefix}-line-height: ${style.lineHeight};`,
        `${prefix}-font-weight: ${style.fontWeight};`,
        `${prefix}-font-stretch: ${stretch};`,
        `${prefix}-letter-spacing: ${style.letterSpacing ?? 'normal'};`,
        `${prefix}-font-style: ${style.fontStyle ?? 'normal'};`,
      );
    }
  }

  return [
    '/* Generated from docs/design/atlas/tokens.json by scripts/build-tokens.js. Do not edit. */',
    ':root {' + lines.join('\n').replace(/^\n/, '\n'),
    '}',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(outputPath, renderTokensCss(readTokens()));
  console.warn(`Wrote ${outputPath}`);
}
