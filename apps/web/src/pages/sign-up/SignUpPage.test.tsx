import { AuthApiError } from '@supabase/supabase-js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readSignupDraft, saveSignupDraft } from '../../features/auth/signupDraft';
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

const takenNames = new Set(['camila ríos']);

function answerDatabase() {
  answerRpc({
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    check_citizen_name: (args) => {
      const name = (args as { p_name: string }).p_name;
      return { data: takenNames.has(name.toLowerCase()) ? 'taken' : 'available', error: null };
    },
  });
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, name = 'Tomás Vera') {
  await user.type(await screen.findByLabelText('Correo'), 'tomas@ejemplo.com');
  await user.type(screen.getByLabelText('Contraseña'), 'una-clave-larga');
  await user.type(screen.getByLabelText('Nombre de tu ciudadano'), name);
  await user.click(await screen.findByRole('radio', { name: 'Argentina' }));
}

describe('SignUpPage', () => {
  beforeEach(() => {
    answerDatabase();
  });

  afterEach(() => {
    resetSupabaseMock();
    sessionStorage.clear();
  });

  it('creates the account with the citizen and asks to confirm the email', async () => {
    const user = userEvent.setup();
    await renderRoute('/sign-up');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crea tu ciudadano' }),
    ).toBeVisible();
    expect(document.title).toBe('Crear cuenta · Concordia');
    await fillForm(user);
    expect(await screen.findByText('Disponible. No podrás cambiarlo después.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Crear mi ciudadano' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Confirma tu correo' }),
    ).toBeVisible();
    expect(screen.getByText('tomas@ejemplo.com')).toBeVisible();
    const draft = readSignupDraft();
    expect(draft?.signupKey).toMatch(/^[0-9a-f]{64}$/);
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'tomas@ejemplo.com',
      password: 'una-clave-larga',
      options: {
        captchaToken: 'turnstile-test-token',
        emailRedirectTo: window.location.origin,
        data: {
          citizen_name: 'Tomás Vera',
          country_code: 'ARG',
          locale: 'es',
          signup_key: draft?.signupKey,
        },
      },
    });
    expect(readSignupDraft()).toMatchObject({ email: 'tomas@ejemplo.com', countryCode: 'ARG' });
  });

  it('says what is missing before sending anything', async () => {
    const user = userEvent.setup();
    await renderRoute('/sign-up');
    await screen.findByRole('radio', { name: 'Argentina' });
    await user.click(screen.getByRole('button', { name: 'Crear mi ciudadano' }));
    expect(screen.getByText('Escribe tu correo, por ejemplo camila@gmail.com.')).toBeVisible();
    expect(screen.getByLabelText('Correo')).toHaveFocus();
    expect(screen.getByText('Faltan 10 caracteres: usa al menos 10.')).toBeVisible();
    expect(screen.getByText('Escribe el nombre de tu ciudadano.')).toBeVisible();
    expect(screen.getByText('Elige el país donde vas a empezar.')).toBeVisible();
    await user.type(screen.getByLabelText('Correo'), 'camila@');
    expect(screen.getByText(/Revisa el correo: falta algo/)).toBeVisible();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('warns about a taken or malformed name while typing', async () => {
    const user = userEvent.setup();
    await renderRoute('/sign-up');
    const name = await screen.findByLabelText('Nombre de tu ciudadano');
    await user.type(name, 'Camila Ríos');
    expect(
      await screen.findByText('Ese nombre ya es de otro ciudadano. Prueba con otro.'),
    ).toBeVisible();
    await user.clear(name);
    await user.type(name, 'Camila__');
    expect(screen.getByText(/Usa entre 3 y 24 letras o números/)).toBeVisible();
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains a name taken at the last moment', async () => {
    const user = userEvent.setup();
    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('Database error saving new user', 500, 'unexpected_failure'),
    });
    await renderRoute('/sign-up');
    await fillForm(user, 'Lucía Paz');
    await screen.findByText('Disponible. No podrás cambiarlo después.');
    takenNames.add('lucía paz');
    await user.click(screen.getByRole('button', { name: 'Crear mi ciudadano' }));
    expect(
      await screen.findByText('Ese nombre ya es de otro ciudadano. Prueba con otro.'),
    ).toBeVisible();
    takenNames.delete('lucía paz');
  });

  it('shows Auth errors without losing the form', async () => {
    const user = userEvent.setup();
    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('captcha', 400, 'captcha_failed'),
    });
    await renderRoute('/sign-up');
    await fillForm(user);
    await screen.findByText('Disponible. No podrás cambiarlo después.');
    await user.click(screen.getByRole('button', { name: 'Crear mi ciudadano' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se completó la verificación de seguridad.',
    );
    expect(screen.getByLabelText('Correo')).toHaveValue('tomas@ejemplo.com');
  });

  it('brings back what was typed when the player fixes the email', async () => {
    saveSignupDraft({
      email: 'tomas@ejemplo.con',
      citizenName: 'Tomás Vera',
      countryCode: 'ARG',
      signupKey: 'a'.repeat(64),
    });
    await renderRoute('/sign-up');
    expect(await screen.findByLabelText('Correo')).toHaveValue('tomas@ejemplo.con');
    expect(screen.getByLabelText('Nombre de tu ciudadano')).toHaveValue('Tomás Vera');
    await waitFor(() => {
      expect(supabaseMock.rpc).toHaveBeenCalledWith('check_citizen_name', {
        p_name: 'Tomás Vera',
        p_signup_key: 'a'.repeat(64),
      });
    });
  });

  it('sends signed-in players to the game', async () => {
    setSession(fakeSession());
    answerRpc({
      get_my_citizen: {
        data: [{ name: 'Camila Ríos', country_code: 'ARG', locale: 'es' }],
        error: null,
      },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    await renderRoute('/sign-up');
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
  });
});
