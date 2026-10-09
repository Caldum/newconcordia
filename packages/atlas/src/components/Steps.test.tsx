import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Steps } from './Steps';

describe('Steps', () => {
  it('numbers the steps and marks the current one', async () => {
    const { container } = render(
      <Steps
        label="Pasos del registro"
        steps={['Tus datos', 'Dónde empezar', 'Tu correo']}
        current={1}
      />,
    );
    const list = screen.getByRole('list', { name: 'Pasos del registro' });
    const items = screen.getAllByRole('listitem');
    expect(list).toBeInTheDocument();
    expect(items.map((item) => item.textContent)).toEqual([
      '1. Tus datos',
      '2. Dónde empezar',
      '3. Tu correo',
    ]);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]?.className).toContain('done');
    expect(items[2]).not.toHaveAttribute('aria-current');
    await expectNoAxeViolations(container);
  });
});
