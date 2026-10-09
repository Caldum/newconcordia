import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MapSearch } from './MapSearch';

const options = [
  { id: 'ARG', name: 'Argentina', kind: 'País' },
  { id: 'ARG-05', name: 'Cuyo', kind: 'Región de Argentina' },
  { id: 'ESP-03', name: 'Madrid', kind: 'Región de España' },
  { id: 'CHL-01', name: 'Norte Grande', kind: 'Región de Chile' },
];

function renderSearch(onChoose = vi.fn()) {
  render(
    <MapSearch
      options={options}
      onChoose={onChoose}
      label="Buscar un país o una región"
      placeholder="Buscar país o región"
      noResults={(query) => `Ningún país ni región coincide con «${query}».`}
      resultCount={(count) => `${count} resultados`}
    />,
  );
  return onChoose;
}

describe('MapSearch', () => {
  it('lists matches ignoring accents and chooses one with the keyboard', async () => {
    const onChoose = renderSearch();
    const input = screen.getByRole('combobox', { name: 'Buscar un país o una región' });
    expect(input).toHaveAttribute('aria-expanded', 'false');

    await userEvent.type(input, 'nor');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('1 resultados');
    await userEvent.keyboard('{Enter}');
    expect(onChoose).toHaveBeenCalledWith(options[3]);
    expect(input).toHaveValue('');
  });

  it('moves the active option with the arrows', async () => {
    const onChoose = renderSearch();
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'a');
    const listed = screen.getAllByRole('option');
    expect(listed.length).toBeGreaterThan(1);
    expect(input).toHaveAttribute('aria-activedescendant', listed[0]?.id);
    await userEvent.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', listed[1]?.id);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', listed.at(-1)?.id);
    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('chooses with the pointer and says when nothing matches', async () => {
    const onChoose = renderSearch();
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'cuy');
    await userEvent.click(screen.getByRole('option', { name: /Cuyo/ }));
    expect(onChoose).toHaveBeenCalledWith(options[1]);

    await userEvent.type(input, 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ningún país ni región coincide con «zzz».',
    );
  });
});
