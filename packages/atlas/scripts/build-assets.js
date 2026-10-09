// Generates src/icons.generated.ts and src/flags.generated.ts from their sources:
// - icons: docs/design/assets/icons/*.svg (stroke icons on a 24 grid)
// - flags: the simplified designs of docs/design/tools/flags.py, and lipis/flag-icons (MIT) for the rest
// Run with `pnpm --filter @concordia/atlas assets`; a test fails when the output drifts.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSvg, renderSvgModule } from './svg.js';

const iconsDir = fileURLToPath(new URL('../../../docs/design/assets/icons', import.meta.url));
const logosDir = fileURLToPath(new URL('../../../docs/design/assets/logos', import.meta.url));
const srcDir = fileURLToPath(new URL('../src', import.meta.url));
const flagIconsDir = join(
  dirname(createRequire(import.meta.url).resolve('flag-icons/package.json')),
  'flags/4x3',
);

/** @param {number} cx @param {number} cy @param {number} r @param {string} fill */
function star(cx, cy, r, fill) {
  const points = Array.from({ length: 10 }, (_, k) => {
    const angle = -Math.PI / 2 + (k * Math.PI) / 5;
    const radius = k % 2 === 0 ? r : r * 0.4;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  });
  return `<polygon fill="${fill}" points="${points.join(' ')}"/>`;
}

/** Flags simplified so they read at 32–56 px (docs/design/tools/flags.py). @type {Record<string, string>} */
const simplifiedFlags = {
  ARG: '<path fill="#74ACDF" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><circle cx="320" cy="240" r="42" fill="#F6B40E" stroke="#85340A" stroke-width="5"/>',
  BRA: '<path fill="#009C3B" d="M0 0h640v480H0z"/><path fill="#FFDF00" d="M66 240 320 58l254 182-254 182z"/><circle cx="320" cy="240" r="104" fill="#002776"/><path d="M220 214c66-16 140-8 196 30" fill="none" stroke="#fff" stroke-width="16"/>',
  PRY:
    '<path fill="#D52B1E" d="M0 0h640v160H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#0038A8" d="M0 320h640v160H0z"/><circle cx="320" cy="240" r="48" fill="none" stroke="#3A7D2C" stroke-width="10"/>' +
    star(320, 240, 22, '#F2B200'),
  MEX: '<path fill="#006847" d="M0 0h213.3v480H0z"/><path fill="#fff" d="M213.3 0h213.4v480H213.3z"/><path fill="#CE1126" d="M426.7 0H640v480H426.7z"/><ellipse cx="320" cy="226" rx="44" ry="52" fill="#8C5A2B"/><path d="M262 270c30 40 86 40 116 0" fill="none" stroke="#3A7D2C" stroke-width="12" stroke-linecap="round"/>',
  ESP: '<path fill="#AA151B" d="M0 0h640v480H0z"/><path fill="#F1BF00" d="M0 120h640v240H0z"/><rect x="150" y="186" width="76" height="96" rx="12" fill="#AA151B" stroke="#C8A100" stroke-width="8"/><rect x="160" y="160" width="56" height="22" rx="4" fill="#C8A100"/>',
  PRT: '<path fill="#046A38" d="M0 0h256v480H0z"/><path fill="#DA291C" d="M256 0h384v480H256z"/><circle cx="256" cy="240" r="80" fill="none" stroke="#FFE900" stroke-width="18"/><rect x="220" y="196" width="72" height="88" rx="10" fill="#fff"/><rect x="236" y="212" width="40" height="56" rx="6" fill="#DA291C"/>',
  URY: '<path fill="#fff" d="M0 0h640v480H0z"/><path fill="#0038A8" d="M266 53h374v53H266zm0 107h374v53H266zM0 267h640v53H0zm0 106h640v53H0z"/><circle cx="133" cy="133" r="50" fill="#FCD116" stroke="#7B3F00" stroke-width="5"/>',
};

/** Flags taken as they are from flag-icons (ISO 3166-1 alpha-3 → file name). */
const flagIconsCodes = {
  CHL: 'cl',
  USA: 'us',
  CAN: 'ca',
  FRA: 'fr',
  ITA: 'it',
  DEU: 'de',
  GBR: 'gb',
};

export function buildIcons() {
  /** @type {Record<string, import('./svg.js').SvgNode[]>} */
  const icons = {};
  for (const file of readdirSync(iconsDir)
    .filter((name) => name.endsWith('.svg'))
    .sort()) {
    icons[basename(file, '.svg')] = parseSvg(readFileSync(join(iconsDir, file), 'utf8')).children;
  }
  return renderSvgModule(
    'iconPaths',
    'Stroke icons from docs/design/assets/icons (24 × 24, drawn with currentColor).',
    icons,
  );
}

export function buildFlags() {
  /** @type {Record<string, import('./svg.js').SvgNode[]>} */
  const flags = {};
  for (const [code, inner] of Object.entries(simplifiedFlags)) {
    flags[code] = parseSvg(`<svg>${inner}</svg>`).children;
  }
  for (const [code, file] of Object.entries(flagIconsCodes)) {
    flags[code] = parseSvg(readFileSync(join(flagIconsDir, `${file}.svg`), 'utf8')).children;
  }
  const sorted = Object.fromEntries(Object.entries(flags).sort(([a], [b]) => a.localeCompare(b)));
  return renderSvgModule(
    'flagPaths',
    'Flags 4:3 (viewBox 0 0 640 480): docs/design/tools/flags.py and lipis/flag-icons (MIT).',
    sorted,
  );
}

export function buildLogos() {
  /** @type {Record<string, import('./svg.js').SvgNode[]>} */
  const logos = {};
  for (const [name, file] of Object.entries({
    mark: 'concordia-mark',
    markOnInk: 'concordia-mark-on-ink',
    appIcon: 'concordia-app-icon',
  })) {
    logos[name] = parseSvg(readFileSync(join(logosDir, `${file}.svg`), 'utf8')).children;
  }
  return renderSvgModule(
    'logoPaths',
    'Brand marks from docs/design/assets/logos (viewBox 0 0 64 64).',
    logos,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(srcDir, 'icons.generated.ts'), buildIcons());
  writeFileSync(join(srcDir, 'flags.generated.ts'), buildFlags());
  writeFileSync(join(srcDir, 'logos.generated.ts'), buildLogos());
  console.warn('Wrote icons, flags and logos');
}
