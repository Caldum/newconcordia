import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Status } from './Status';

describe('Status', () => {
  it('always carries its word; the live dot is decorative', async () => {
    const { container } = render(<Status tone="live">En vivo</Status>);
    expect(screen.getByText('En vivo')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('applies the tone and an optional icon', () => {
    const { container } = render(
      <Status tone="ok" icon="check">
        Aprobada
      </Status>,
    );
    expect(container.firstElementChild?.className).toContain('ok');
    expect(container.querySelector('svg')).toHaveAttribute('width', '14');
  });
});
