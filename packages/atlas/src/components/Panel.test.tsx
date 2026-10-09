import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Panel, PanelBody, PanelHeader } from './Panel';
import { Status } from './Status';

describe('Panel', () => {
  it('composes a header with a heading and an action, and a body', async () => {
    const { container } = render(
      <Panel aria-labelledby="tu-dia">
        <PanelHeader
          title={<span id="tu-dia">Tu día</span>}
          action={<Status tone="warning">84 de energía</Status>}
        />
        <PanelBody>Lo cotidiano.</PanelBody>
      </Panel>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Tu día' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tu día' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('renders each surface and element', () => {
    const { container } = render(
      <div>
        <Panel surface="ink" as="div" />
        <Panel surface="nation" as="article" />
        <Panel surface="map" as="aside">
          <PanelHeader level={3} title="Mapa" />
        </Panel>
      </div>,
    );
    expect(container.firstElementChild?.firstElementChild?.className).toContain('ink');
    expect(container.querySelector('article')?.className).toContain('nation');
    expect(screen.getByRole('heading', { level: 3, name: 'Mapa' })).toBeInTheDocument();
  });
});
