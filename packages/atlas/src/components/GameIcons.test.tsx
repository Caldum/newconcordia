import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CreditIcon, EnergyIcon, GoldIcon } from './GameIcons';

describe('game icons', () => {
  it('are decorative: the number beside them carries the meaning', () => {
    const { container } = render(
      <>
        <GoldIcon />
        <CreditIcon />
        <EnergyIcon size={24} />
      </>,
    );
    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(3);
    for (const icon of icons) expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icons[2]).toHaveAttribute('width', '24');
  });
});
