import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Scoreboard } from './Scoreboard';
import { Silhouette } from './Silhouette';

describe('Scoreboard', () => {
  it('summarizes the battle for screen readers and shows both sides', async () => {
    const { container } = render(
      <Scoreboard
        summary="Argentina 58 %, España 42 %"
        left={{ country: 'Argentina', percent: 58, role: 'Defiende su región', tone: 'own' }}
        right={{ country: 'España', percent: 42, role: 'Ocupa desde el lunes', tone: 'rival' }}
        region={<Silhouette shapes={[{ d: 'M0 0h10v10H0z' }]} viewBox="0 0 10 10" label="Cuyo" />}
      />,
    );
    expect(screen.getByRole('group', { name: 'Argentina 58 %, España 42 %' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cuyo' })).toBeInTheDocument();
    expect(screen.getByText('Defiende su región. Ocupa desde el lunes.')).toBeInTheDocument();
    expect(container.textContent).toContain('58%');
    await expectNoAxeViolations(container);
  });
});
