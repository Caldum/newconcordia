import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Note, Toast, ToastRegion } from './Note';

describe('Note', () => {
  it('announces errors as alerts and keeps other tones in the flow', async () => {
    const { container } = render(
      <div>
        <Note tone="info">Al registrarte ya eres ciudadano.</Note>
        <Note tone="error">No se pudo comprar: el vendedor ya no tiene stock.</Note>
      </div>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo comprar');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    await expectNoAxeViolations(container);
  });

  it('shows the icon of each tone', () => {
    const { container } = render(
      <div>
        <Note tone="warning">Taller Ríos tiene hierro para 1 día.</Note>
        <Note tone="ok">Guardado.</Note>
      </div>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });
});

describe('Toast', () => {
  it('is announced through a polite live region', async () => {
    const { container } = render(
      <ToastRegion label="Avisos">
        <Toast>Cobraste 36,96 Crédito.</Toast>
      </ToastRegion>,
    );
    const region = screen.getByRole('status', { name: 'Avisos' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Cobraste 36,96 Crédito.');
    await expectNoAxeViolations(container);
  });
});
