import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from './Icon';

describe('Icon', () => {
  it('is decorative by default', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg?.querySelector('path')).toHaveAttribute('d', 'm5 12.5 4.5 4.5L19 7.5');
  });

  it('has an accessible name when labeled', () => {
    render(<Icon name="bell" size={24} label="Avisos" />);
    expect(screen.getByRole('img', { name: 'Avisos' })).toHaveAttribute('width', '24');
  });
});
