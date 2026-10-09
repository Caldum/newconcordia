import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { OptionGroup } from './Option';
import type { OptionItem } from './Option';

type Start = 'arg' | 'bra' | 'ury';

const options: OptionItem<Start>[] = [
  { value: 'arg', title: 'Argentina', description: '3.412 ciudadanos', place: true },
  { value: 'bra', title: 'Brasil', description: '5.980 ciudadanos', place: true },
  {
    value: 'ury',
    title: 'Uruguay',
    description: 'Todavía no está en juego',
    disabled: true,
    place: true,
  },
];

function Controlled({ onChange }: { onChange?: (value: Start) => void }) {
  const [value, setValue] = useState<Start | null>(null);
  return (
    <OptionGroup
      label="Dónde empezar"
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('OptionGroup', () => {
  it('is a labeled radio group with one tab stop', async () => {
    const { container } = render(<Controlled />);
    expect(screen.getByRole('radiogroup', { name: 'Dónde empezar' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
    await expectNoAxeViolations(container);
  });

  it('checks on click and moves with the arrows, skipping disabled options', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /Argentina/ }));
    expect(screen.getByRole('radio', { name: /Argentina/ })).toBeChecked();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /Brasil/ })).toHaveFocus();
    expect(screen.getByRole('radio', { name: /Brasil/ })).toBeChecked();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /Argentina/ })).toBeChecked();

    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: /Brasil/ })).toBeChecked();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: /Argentina/ })).toBeChecked();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: /Brasil/ })).toBeChecked();
    await userEvent.keyboard('{Escape}');
    expect(onChange).toHaveBeenLastCalledWith('bra');
  });

  it('keeps unavailable options disabled with their reason', () => {
    render(<Controlled />);
    const uruguay = screen.getByRole('radio', { name: /Uruguay/ });
    expect(uruguay).toBeDisabled();
    expect(uruguay).toHaveTextContent('Todavía no está en juego');
  });
});
