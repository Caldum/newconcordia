import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { countryRows, regionRows } from '../../test/fixtures/world';
import { renderRoute } from '../../test/renderRoute';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }));

// Vitest runs from apps/web; jsdom gives import.meta.url an http scheme, so the path is built from cwd.
const topology = readFileSync(join(process.cwd(), '../../data/map/world-regions.json'), 'utf8');

function answerRpc() {
  rpc.mockImplementation((name: string) =>
    Promise.resolve(
      name === 'list_countries'
        ? { data: countryRows, error: null }
        : { data: regionRows, error: null },
    ),
  );
}

describe('MapPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(topology, { status: 200 })),
    );
    answerRpc();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rpc.mockReset();
  });

  it('colors each region with the color of its current owner', async () => {
    const { container } = await renderRoute('/map');
    expect(await screen.findByRole('img', { name: /Planisferio/ })).toBeInTheDocument();
    const cuyo = container.querySelector('[data-shape="ARG-05"]');
    expect(cuyo).toHaveAttribute('fill', '#D0453A');
    expect(container.querySelector('[data-shape="ARG-01"]')).toHaveAttribute('fill', '#6CACE4');
    // Disputed territories and countries not in play stay gray and inert.
    expect(container.querySelector('[data-shape="ESP-07"]')).not.toHaveAttribute('fill');
    expect(container.querySelector('[data-shape="URY"]')).not.toHaveAttribute('fill');
    expect(document.title).toBe('Mapa · Concordia');
  });

  it('selects a region from the map and announces it', async () => {
    const { container } = await renderRoute('/map');
    await screen.findByRole('img', { name: /Planisferio/ });
    const cuyo = container.querySelector('[data-shape="ARG-05"]');
    if (!cuyo) throw new Error('Cuyo is missing');
    // fireEvent sends only the click: user-event's mousedown has no `view`, which d3-zoom reads.
    fireEvent.click(cuyo);
    expect(screen.getByRole('heading', { level: 2, name: 'Cuyo' })).toBeInTheDocument();
    expect(screen.getByText('Elegiste Cuyo.')).toBeInTheDocument();
  });

  it('reaches countries and regions with the keyboard through the search box', async () => {
    await renderRoute('/map', 'en');
    const search = await screen.findByRole('combobox', {
      name: 'Search for a country or a region',
    });
    await userEvent.type(search, 'spa');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 2, name: 'Spain' })).toBeInTheDocument();
    expect(screen.getByText('2 regions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Canarias' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cuyo' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Cuyo' })).toBeInTheDocument();
  });

  it('offers to retry when the map cannot be loaded', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('network down') });
    await renderRoute('/map');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa.');
    answerRpc();
    await userEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }));
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Planisferio/ })).toBeInTheDocument();
    });
  });

  it('reports a geometry that cannot be downloaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response('', { status: 503 })),
    );
    await renderRoute('/map');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa.');
  });
});
