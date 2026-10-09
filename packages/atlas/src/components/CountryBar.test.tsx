import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { BrandMark } from './Brand';
import { CountryBar, CountryBarNav, ResourceChip } from './CountryBar';
import { GoldIcon } from './GameIcons';

describe('CountryBar', () => {
  it('shows the brand, the sections with the current one, and the resources', async () => {
    const { container } = render(
      <CountryBar
        brand={
          <a href="/inicio">
            <BrandMark size={30} label="Concordia, ir al inicio" />
          </a>
        }
        navigation={
          <CountryBarNav
            label="Principal"
            links={[
              <a key="inicio" href="/inicio" aria-current="page">
                Inicio
              </a>,
              <a key="mapa" href="/mapa">
                Mapa
              </a>,
            ]}
          />
        }
        resources={
          <>
            <ResourceChip icon={<GoldIcon />} label="1.240 Oro">
              1.240
            </ResourceChip>
            <ResourceChip>38.450 Crédito</ResourceChip>
          </>
        }
      />,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('group', { name: '1.240 Oro' })).toBeInTheDocument();
    expect(screen.getByText('38.450 Crédito')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
