import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Brand, BrandMark } from './Brand';

describe('BrandMark', () => {
  it('is decorative unless labeled', () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    render(<BrandMark version="appIcon" label="Concordia" />);
    expect(screen.getByRole('img', { name: 'Concordia' })).toBeInTheDocument();
  });

  it('paints the disputed region with the player color', () => {
    const { container } = render(<BrandMark disputedColor="#6CACE4" />);
    const fills = [...container.querySelectorAll('path')].map((path) => path.getAttribute('fill'));
    expect(fills).not.toContain('#C8372D');
    expect(fills.filter((fill) => fill === '#6CACE4').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Brand', () => {
  it('writes the logotype next to the mark', () => {
    render(<Brand size={30} onInk />);
    expect(screen.getByText('Concordia')).toBeInTheDocument();
  });
});
