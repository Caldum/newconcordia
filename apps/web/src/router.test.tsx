import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildRouter } from './router';
import { renderRoute } from './test/renderRoute';

describe('router', () => {
  it('renders the home page at /', async () => {
    await renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Concordia' })).toBeVisible();
  });

  it('renders the not-found page for unknown paths', async () => {
    await renderRoute('/no-existe');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta página no está en el mapa.' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Página no encontrada · Concordia');
  });

  it('renders the not-found page in English', async () => {
    await renderRoute('/missing', 'en');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This page is not on the map.' }),
    ).toBeVisible();
    expect(document.title).toBe('Page not found · Concordia');
  });

  it('uses the browser history when none is given', () => {
    window.history.replaceState(null, '', '/inicio-de-prueba');
    const router = buildRouter(new QueryClient());
    expect(router.history.location.pathname).toBe('/inicio-de-prueba');
  });
});
