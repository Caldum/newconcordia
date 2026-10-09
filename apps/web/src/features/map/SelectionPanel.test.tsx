import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '../../pages/map/messages';
import { world } from '../../test/fixtures/world';

import { SelectionPanel } from './SelectionPanel';
import type { Selection } from './SelectionPanel';

const copy = messages.es;

function renderPanel(selection: Selection, onSelect = vi.fn()) {
  render(
    <SelectionPanel
      selection={selection}
      regions={world.regions}
      countries={world.countries}
      provincesOf={(code) => (code === 'ARG-05' ? ['Mendoza', 'San Juan'] : [])}
      countryName={(code) => world.countries.get(code)?.name_es ?? code}
      onSelect={onSelect}
      copy={copy}
      viewCountryLabel={copy.viewCountry}
    />,
  );
  return onSelect;
}

describe('SelectionPanel', () => {
  it('invites to choose when nothing is selected', () => {
    renderPanel(null);
    expect(screen.getByText(copy.chooseHint)).toBeInTheDocument();
  });

  it('describes an occupied region and leads to its owner', async () => {
    const onSelect = renderPanel({ type: 'region', code: 'ARG-05' });
    expect(screen.getByRole('heading', { level: 2, name: 'Cuyo' })).toBeInTheDocument();
    expect(screen.getByText('Región de Argentina')).toBeInTheDocument();
    expect(screen.getByText('Ocupada. España se la quitó a Argentina.')).toBeInTheDocument();
    expect(screen.getByText('Mendoza, San Juan')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver España' }));
    expect(onSelect).toHaveBeenCalledWith({ type: 'country', code: 'ESP' });
  });

  it('marks disputed territories as not in play', () => {
    renderPanel({ type: 'region', code: 'ESP-07' });
    expect(screen.getByText(copy.disabled)).toBeInTheDocument();
  });

  it('summarizes a country and lists the regions it controls', async () => {
    const onSelect = renderPanel({ type: 'country', code: 'ARG' });
    expect(screen.getByText('1 región')).toBeInTheDocument();
    expect(screen.getByText('1 de 2 propias')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Buenos Aires' }));
    expect(onSelect).toHaveBeenCalledWith({ type: 'region', code: 'ARG-01' });
  });

  it('says when a country is not in play, and ignores unknown codes', () => {
    renderPanel({ type: 'country', code: 'URY' });
    expect(screen.getByText(copy.notInPlay)).toBeInTheDocument();
  });

  it('describes a region under its own country, without provinces', () => {
    renderPanel({ type: 'region', code: 'ARG-01' });
    expect(screen.getByText('Bajo control de Argentina.')).toBeInTheDocument();
    expect(screen.queryByText('Provincias')).not.toBeInTheDocument();
  });

  it('renders nothing for unknown codes', () => {
    const { container } = render(
      <SelectionPanel
        selection={{ type: 'region', code: 'XXX-01' }}
        regions={world.regions}
        countries={world.countries}
        provincesOf={() => []}
        countryName={(code) => code}
        onSelect={vi.fn()}
        copy={copy}
        viewCountryLabel={copy.viewCountry}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
