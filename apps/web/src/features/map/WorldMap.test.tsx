import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Shape } from './geometry';
import { WorldMap } from './WorldMap';

const shapes: Shape[] = [
  {
    id: 'ARG-05',
    homeCountry: 'ARG',
    isRegion: true,
    provinces: [],
    d: 'M100 100h50v50h-50z',
    bounds: [
      [100, 100],
      [150, 150],
    ],
  },
  {
    id: 'URY',
    homeCountry: 'URY',
    isRegion: false,
    provinces: [],
    d: 'M200 200h20v20h-20z',
    bounds: [
      [200, 200],
      [220, 220],
    ],
  },
];

function renderMap(props: Partial<Parameters<typeof WorldMap>[0]> = {}) {
  const onSelect = vi.fn();
  const result = render(
    <WorldMap
      shapes={shapes}
      borders={{ countryBorders: 'M0 0L1 1', regionBorders: '' }}
      fillOf={(id) => (id === 'ARG-05' ? '#D0453A' : undefined)}
      selectedId="ARG-05"
      onSelect={onSelect}
      focusId={null}
      label="Mapa del mundo"
      labels={{ zoomIn: 'Acercar', zoomOut: 'Alejar', zoomReset: 'Ver todo el mapa' }}
      {...props}
    />,
  );
  return { ...result, onSelect };
}

describe('WorldMap', () => {
  it('is one labeled image whose playable shapes respond to clicks', () => {
    const { container, onSelect } = renderMap();
    expect(screen.getByRole('img', { name: 'Mapa del mundo' })).toBeInTheDocument();
    const cuyo = container.querySelector('[data-shape="ARG-05"]');
    expect(cuyo?.getAttribute('class')).toContain('selected');
    // fireEvent sends only the click: user-event's mousedown has no `view`, which d3-zoom reads.
    if (cuyo) fireEvent.click(cuyo);
    expect(onSelect).toHaveBeenCalledWith('ARG-05');
    const uruguay = container.querySelector('[data-shape="URY"]');
    if (uruguay) fireEvent.click(uruguay);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('zooms with buttons and brings a focused shape into view', async () => {
    const { container, rerender } = renderMap();
    const layer = container.querySelector('svg > g');
    await userEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    await waitFor(() => {
      expect(layer?.getAttribute('transform')).toMatch(/scale\(1\.6/);
    });
    await userEvent.click(screen.getByRole('button', { name: 'Alejar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo el mapa' }));
    await waitFor(() => {
      expect(layer?.getAttribute('transform')).toBe('translate(0,0) scale(1)');
    });

    rerender(
      <WorldMap
        shapes={shapes}
        borders={{ countryBorders: '', regionBorders: '' }}
        fillOf={() => undefined}
        selectedId={null}
        onSelect={vi.fn()}
        focusId="ARG-05"
        label="Mapa del mundo"
        labels={{ zoomIn: 'Acercar', zoomOut: 'Alejar', zoomReset: 'Ver todo el mapa' }}
      />,
    );
    await waitFor(() => {
      expect(layer?.getAttribute('transform')).toMatch(/scale\((?!1\))/);
    });
  });
});
