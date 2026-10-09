import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Document } from './Document';
import { Silhouette } from './Silhouette';

describe('Document', () => {
  it('lists the citizen data as a description list under the country', async () => {
    const { container } = render(
      <Document
        heading="Documento de ciudadanía"
        country="República Argentina"
        animate
        silhouette={
          <Silhouette
            shapes={[{ d: 'M0 0h5v5H0z', highlighted: true }]}
            viewBox="0 0 10 10"
            label="Argentina, tu región es Buenos Aires"
          />
        }
        fields={[
          { label: 'Nombre', value: 'Camila Ríos', kind: 'name' },
          { label: 'Número', value: 'ARG-003413', kind: 'number' },
          { label: 'Región', value: 'Buenos Aires', kind: 'place' },
          { label: 'Regalo de inicio', value: '5 Oro y 50 Crédito' },
        ]}
      />,
    );
    expect(
      screen.getByRole('article', { name: 'Documento de ciudadanía, República Argentina' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Documento de ciudadanía' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Camila Ríos').closest('div')?.className).toContain('wide');
    expect(screen.getByText('ARG-003413').className).toContain('at-figure');
    expect(screen.getByText('Buenos Aires').className).toContain('at-place');
    expect(container.firstElementChild?.className).toContain('enter');
    await expectNoAxeViolations(container);
  });
});
