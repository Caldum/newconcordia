import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Silhouette } from './Silhouette';

const square = { d: 'M0 0h10v10H0z' };

describe('Silhouette', () => {
  it('is an image named after the place, filled with its color', async () => {
    const { container } = render(
      <Silhouette shapes={[square]} viewBox="0 0 10 10" label="Cuyo" fill="var(--country-arg)" />,
    );
    expect(screen.getByRole('img', { name: 'Cuyo' })).toBeInTheDocument();
    expect(container.querySelector('path')).toHaveAttribute('fill', 'var(--country-arg)');
    await expectNoAxeViolations(container);
  });

  it('splits a region in battle with a hard gradient', () => {
    const { container } = render(
      <Silhouette
        shapes={[square]}
        viewBox="0 0 10 10"
        label="Cuyo"
        split={{ bottomColor: '#6CACE4', topColor: '#D0453A', bottomShare: 0.58 }}
      />,
    );
    const stops = container.querySelectorAll('stop');
    expect(stops[0]).toHaveAttribute('offset', '58%');
    expect(stops[1]).toHaveAttribute('offset', '58%');
    const gradientId = container.querySelector('linearGradient')?.id ?? '';
    expect(container.querySelector('path')).toHaveAttribute('fill', `url(#${gradientId})`);
  });

  it('marks a highlighted region and draws borders between regions', () => {
    const { container } = render(
      <Silhouette
        shapes={[{ d: 'M0 0h5v5H0z', highlighted: true }, square]}
        viewBox="0 0 10 10"
        label="Argentina, tu región es Buenos Aires"
        fill="var(--nation)"
        borders
      />,
    );
    const paths = container.querySelectorAll('path');
    expect(paths[0]).toHaveAttribute('fill', 'var(--nation-deep)');
    expect(paths[1]).toHaveAttribute('fill', 'var(--nation)');
    expect(paths[1]).toHaveAttribute('stroke', '#FFFFFF');
  });

  it('shows a country not in play as a dotted outline', () => {
    const { container } = render(
      <Silhouette shapes={[square]} viewBox="0 0 10 10" label="Uruguay" inactive />,
    );
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('fill', 'none');
    expect(path).toHaveAttribute('stroke-dasharray', '4 4');
  });
});
