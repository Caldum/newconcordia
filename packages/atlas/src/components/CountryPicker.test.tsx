import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { CountryPicker, otherCountry } from './CountryPicker';

const countries = [
  { code: 'ARG', name: 'Argentina' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'MEX', name: 'México' },
  { code: 'ATA', name: 'Antártida' },
];

function Picker({ initial = null }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <CountryPicker
        label="País"
        countries={countries}
        value={value}
        onChange={setValue}
        searchLabel="Buscar país"
        countText="4 países en juego"
        resultsText={(count, query) =>
          count === 0 ? `Ningún país coincide con «${query}»` : `${count} países`
        }
        otherLabel="Otro país"
      />
      <p data-testid="value">{value ?? 'ninguno'}</p>
    </>
  );
}

describe('CountryPicker', () => {
  it('lists the countries with their flags as a radio group plus «Otro país»', async () => {
    const { container } = render(<Picker initial="BRA" />);
    expect(screen.getByRole('radiogroup', { name: 'País' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      'Argentina',
      'Brasil',
      'México',
      'Antártida',
      'Otro país',
    ]);
    expect(screen.getByRole('radio', { name: 'Brasil' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Brasil' })).toHaveAttribute('tabindex', '0');
    await expectNoAxeViolations(container);
  });

  it('filters by name ignoring accents and case, and announces the result', async () => {
    render(<Picker />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar país' }), 'MEXI');
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      'México',
      'Otro país',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('1 países');

    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'zz');
    expect(screen.getByRole('status')).toHaveTextContent('Ningún país coincide con «zz»');
  });

  it('chooses with the keyboard and reaches «Otro país»', async () => {
    render(<Picker />);
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Argentina' })).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(screen.getByTestId('value')).toHaveTextContent('ARG');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByTestId('value')).toHaveTextContent('BRA');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Otro país' })).toHaveFocus();
    expect(screen.getByTestId('value')).toHaveTextContent(otherCountry);
  });
});
