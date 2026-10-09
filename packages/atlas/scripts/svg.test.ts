// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { parseSvg, renderSvgModule } from './svg.js';

describe('parseSvg', () => {
  it('parses nested elements, attributes and self-closing tags', () => {
    const svg = parseSvg(
      '<svg viewBox="0 0 24 24" fill="none"><g fill-rule="evenodd"><path d="M0 0h1"/><circle cx="1" cy="2" r="3"></circle></g></svg>',
    );
    expect(svg.attrs).toEqual({ viewBox: '0 0 24 24', fill: 'none' });
    expect(svg.children).toEqual([
      [
        'g',
        { 'fill-rule': 'evenodd' },
        [
          ['path', { d: 'M0 0h1' }],
          ['circle', { cx: '1', cy: '2', r: '3' }],
        ],
      ],
    ]);
  });

  it('ignores comments, declarations and whitespace between tags', () => {
    const svg = parseSvg(
      '<?xml version="1.0"?>\n<!-- note -->\n<svg>\n  <path d="M1 1"/>\n</svg>\n',
    );
    expect(svg.children).toEqual([['path', { d: 'M1 1' }]]);
  });

  it('rejects text content, scripts and event handlers', () => {
    expect(() => parseSvg('<svg><text>Hola</text></svg>')).toThrow(/text/);
    expect(() => parseSvg('<svg><script>alert(1)</script></svg>')).toThrow(/script/);
    expect(() => parseSvg('<svg><path onclick="x()" d="M0"/></svg>')).toThrow(/onclick/);
  });

  it('rejects unbalanced markup', () => {
    expect(() => parseSvg('<svg><g></svg>')).toThrow(/closing/);
  });
});

describe('renderSvgModule', () => {
  it('emits a typed, readable TypeScript module', () => {
    const source = renderSvgModule('icons', 'Icon data', { check: [['path', { d: 'm5 12 4 4' }]] });
    expect(source).toContain('export const icons = {');
    expect(source).toContain(`check: [['path', { d: 'm5 12 4 4' }]],`);
    expect(source).toContain('} as const satisfies Record<string, readonly SvgNode[]>;');
  });
});
