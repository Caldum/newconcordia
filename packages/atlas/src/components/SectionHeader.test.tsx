import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { SectionHeader } from './SectionHeader';

const plates = ['banks', 'economy', 'market', 'politics', 'press', 'resources', 'war'];

function read(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
}

describe('SectionHeader', () => {
  it('shows the title as the page heading and a decorative plate', async () => {
    const { container } = render(
      <SectionHeader
        title="Mercado"
        subtitle="Cada país tiene su propio mercado. Compras con Crédito y la mercancía llega a tu inventario al instante."
        illustration="market"
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Mercado' })).toBeInTheDocument();
    const plate = container.querySelector('img');
    expect(plate).toHaveAttribute('alt', '');
    expect(plate?.getAttribute('src')).toMatch(/market|^data:image\/svg/);
    await expectNoAxeViolations(container);
  });

  it.each(plates)('ships an exact copy of the %s plate', (name) => {
    expect(read(`../assets/illustrations/${name}.svg`)).toBe(
      read(`../../../../docs/design/assets/illustrations/${name}.svg`),
    );
  });
});
