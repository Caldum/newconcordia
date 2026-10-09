import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { countryRows, regionRows } from '../../test/fixtures/world';
import { renderRoute } from '../../test/renderRoute';
import { answerRpc, fakeSession, resetSupabaseMock, setSession } from '../../test/supabaseMock';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

describe('CreateCitizenPage', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('creates the citizen of a Google account and opens the game', async () => {
    const user = userEvent.setup();
    let citizen: unknown[] = [];
    answerRpc({
      get_my_citizen: () => ({ data: citizen, error: null }),
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
      check_citizen_name: { data: 'available', error: null },
      create_my_citizen: (args) => {
        const { p_name: name } = args as { p_name: string };
        citizen = [{ name, country_code: 'ESP', locale: 'es' }];
        return { data: citizen, error: null };
      },
    });
    setSession(fakeSession('tomas@gmail.com'));
    await renderRoute('/citizen');
    await user.type(await screen.findByLabelText('Nombre de tu ciudadano'), 'Tomás Vera');
    await user.click(screen.getByRole('radio', { name: 'España' }));
    await screen.findByText('Disponible. No podrás cambiarlo después.');
    await user.click(screen.getByRole('button', { name: 'Crear mi ciudadano' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Tomás Vera' })).toBeVisible();
    expect(screen.getByText('Ciudadanía: España')).toBeVisible();
  });

  it('marks the name when the database says it is taken', async () => {
    const user = userEvent.setup();
    answerRpc({
      get_my_citizen: { data: [], error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
      check_citizen_name: { data: 'available', error: null },
      create_my_citizen: { data: null, error: { message: 'citizen_name_taken' } },
    });
    setSession(fakeSession('tomas@gmail.com'));
    await renderRoute('/citizen');
    await user.type(await screen.findByLabelText('Nombre de tu ciudadano'), 'Tomás Vera');
    await user.click(screen.getByRole('radio', { name: 'Argentina' }));
    await screen.findByText('Disponible. No podrás cambiarlo después.');
    await user.click(screen.getByRole('button', { name: 'Crear mi ciudadano' }));
    expect(
      await screen.findByText('Ese nombre ya es de otro ciudadano. Prueba con otro.'),
    ).toBeVisible();
  });

  it('sends visitors to sign in', async () => {
    await renderRoute('/citizen');
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  });
});
