import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Field } from './Field';

describe('Field', () => {
  it('labels the input and accepts typing', async () => {
    render(<Field label="Correo" type="email" />);
    const input = screen.getByRole('textbox', { name: 'Correo' });
    await userEvent.type(input, 'camila@ejemplo.com');
    expect(input).toHaveValue('camila@ejemplo.com');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('ties the error to the input and marks it invalid', async () => {
    const { container } = render(
      <Field
        label="Correo"
        defaultValue="camila@"
        error="Falta el dominio, por ejemplo camila@gmail.com."
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Correo' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Falta el dominio, por ejemplo camila@gmail.com.');
    await expectNoAxeViolations(container);
  });

  it('shows a confirmation or a hint when there is no error', () => {
    const { rerender } = render(<Field label="Nombre" success="Nombre disponible" />);
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAccessibleDescription(
      'Nombre disponible',
    );
    rerender(<Field label="Nombre" id="nombre" hint="Es único y no se puede cambiar." />);
    const input = screen.getByRole('textbox', { name: 'Nombre' });
    expect(input).toHaveAttribute('id', 'nombre');
    expect(input).toHaveAccessibleDescription('Es único y no se puede cambiar.');
  });

  it('has no description when there is nothing to say', () => {
    render(<Field label="Contraseña" type="password" />);
    expect(screen.getByLabelText('Contraseña')).not.toHaveAttribute('aria-describedby');
  });

  it('passes its ref to the input so forms can move focus to it', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Field label="Correo" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('Correo'));
  });
});
