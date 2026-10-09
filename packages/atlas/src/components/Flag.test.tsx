import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Flag, hasFlag } from './Flag';

describe('Flag', () => {
  it('renders a decorative 4:3 flag', () => {
    const { container } = render(<Flag code="ARG" width={48} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.width).toBe('48px');
    expect(wrapper.style.height).toBe('36px');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps ids unique when the same flag appears twice', async () => {
    const { container } = render(
      <div>
        <Flag code="USA" />
        <Flag code="USA" />
      </div>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    await expectNoAxeViolations(container);
  });

  it('knows which countries have a flag', () => {
    expect(hasFlag('ESP')).toBe(true);
    expect(hasFlag('ATA')).toBe(false);
  });
});
