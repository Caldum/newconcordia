import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { countryRows, regionRows } from '../../test/fixtures/world';
import { renderRoute } from '../../test/renderRoute';
import {
  answerRpc,
  fakeSession,
  resetSupabaseMock,
  setSession,
  supabaseMock,
} from '../../test/supabaseMock';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

describe('home', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('welcomes visitors with the countries in play and the ways in', async () => {
    answerRpc({
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    await renderRoute('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'El mundo está cambiando' }),
    ).toBeVisible();
    expect(await screen.findByText('2 países en juego')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Elegir mi país' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Un día en Concordia' })).toBeVisible();
  });

  it('switches the language', async () => {
    const user = userEvent.setup();
    await renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'English' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The world is changing' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.lang).toBe('en');
  });

  it('shows the citizen to a signed-in player and signs out', async () => {
    const user = userEvent.setup();
    answerRpc({
      get_my_citizen: {
        data: [{ name: 'Camila Ríos', country_code: 'ARG', locale: 'es' }],
        error: null,
      },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
    expect(await screen.findByText('Ciudadanía: Argentina')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'El mundo está cambiando' }),
    ).toBeVisible();
  });

  it('says so when the citizen cannot be loaded', async () => {
    answerRpc({ get_my_citizen: { data: null, error: new Error('down') } });
    setSession(fakeSession());
    await renderRoute('/');
    expect(await screen.findByText(/No se pudo cargar tu ciudadano/)).toBeVisible();
  });
});
