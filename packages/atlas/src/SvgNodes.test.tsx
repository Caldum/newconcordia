import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderSvgNodes } from './SvgNodes';
import type { SvgNode } from './SvgNodes';

const nodes: readonly SvgNode[] = [
  ['defs', {}, [['clipPath', { id: 'a' }, [['path', { d: 'M0 0' }]]]]],
  [
    'g',
    { 'clip-path': 'url(#a)', 'fill-rule': 'evenodd', class: 'flag' },
    [['use', { href: '#a' }]],
  ],
];

describe('renderSvgNodes', () => {
  it('maps attributes to React props and prefixes ids and references', () => {
    const { container } = render(<svg>{renderSvgNodes(nodes, 'p1')}</svg>);
    expect(container.querySelector('clipPath')?.getAttribute('id')).toBe('p1-a');
    const group = container.querySelector('g');
    expect(group?.getAttribute('clip-path')).toBe('url(#p1-a)');
    expect(group?.getAttribute('fill-rule')).toBe('evenodd');
    expect(group?.getAttribute('class')).toBe('flag');
    expect(container.querySelector('use')?.getAttribute('href')).toBe('#p1-a');
  });
});
