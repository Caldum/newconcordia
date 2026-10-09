import { createElement } from 'react';
import type { ReactNode } from 'react';

/** An SVG element as data: tag, attributes and optional children (see scripts/svg.js). */
export type SvgNode =
  | readonly [tag: string, attrs: Readonly<Record<string, string>>]
  | readonly [tag: string, attrs: Readonly<Record<string, string>>, children: readonly SvgNode[]];

const urlReference = /url\(#([^)]+)\)/g;

function reactName(attribute: string): string {
  if (attribute === 'class') return 'className';
  if (attribute.startsWith('aria-') || attribute.startsWith('data-')) return attribute;
  return attribute.replace(/[:-]([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Renders SVG data as React elements. Element ids and the references to them are prefixed, so the
 * same flag or icon can appear several times on a page without duplicate ids.
 */
export function renderSvgNodes(nodes: readonly SvgNode[], idPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const [tag, attrs, children] = node;
    const props: Record<string, string | number> = { key: index };
    for (const [name, value] of Object.entries(attrs)) {
      let resolved = value.replace(urlReference, (_, id: string) => `url(#${idPrefix}-${id})`);
      if (name === 'id') resolved = `${idPrefix}-${value}`;
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
        resolved = `#${idPrefix}-${value.slice(1)}`;
      }
      props[reactName(name)] = resolved;
    }
    return createElement(tag, props, children ? renderSvgNodes(children, idPrefix) : undefined);
  });
}
