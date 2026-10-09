import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Stage } from './Stage';

describe('Stage', () => {
  it('shows its content and a decorative stripe with 13 colors', async () => {
    const { container } = render(
      <Stage aria-labelledby="titular">
        <h1 id="titular" className="at-display">
          Cuyo está en disputa.
        </h1>
      </Stage>,
    );
    expect(screen.getByRole('region', { name: 'Cuyo está en disputa.' })).toBeInTheDocument();
    const stripe = container.querySelector('[aria-hidden="true"]');
    expect(stripe?.children).toHaveLength(13);
    await expectNoAxeViolations(container);
  });

  it('can drop the stripe', () => {
    const { container } = render(<Stage stripe={false}>Contenido</Stage>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
