import { AuthApiError } from '@supabase/supabase-js';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
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

describe('SignInPage', () => {
  beforeEach(() => {
    answerRpc({
      get_my_citizen: {
        data: [citizenRow()],
        error: null,
      },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
  });

  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('signs in and opens the game', async () => {
    const user = userEvent.setup();
    supabaseMock.auth.signInWithPassword.mockImplementationOnce(() => {
      setSession(fakeSession());
      return Promise.resolve({ data: {}, error: null });
    });
    await renderRoute('/sign-in');
    expect(document.title).toBe('Iniciar sesión · Concordia');
    await user.type(await screen.findByLabelText('Correo'), 'camila@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'una-clave-larga');
    await user.click(screen.getByRole('button', { name: 'Entrar a Concordia' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'camila@ejemplo.com',
      password: 'una-clave-larga',
      options: { captchaToken: 'turnstile-test-token' },
    });
  });

  it('remembers the choice to keep the session only for this browser session', async () => {
    const user = userEvent.setup();
    await renderRoute('/sign-in');
    const remember = await screen.findByRole('checkbox', {
      name: 'Mantener la sesión en este equipo',
    });
    expect(remember).toBeChecked();
    await user.click(remember);
    await user.type(screen.getByLabelText('Correo'), 'camila@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'una-clave-larga');
    await user.click(screen.getByRole('button', { name: 'Entrar a Concordia' }));
    expect(localStorage.getItem('concordia.session.remember')).toBe('false');
  });

  it('explains wrong credentials and empty fields', async () => {
    const user = userEvent.setup();
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    });
    await renderRoute('/sign-in');
    await user.click(await screen.findByRole('button', { name: 'Entrar a Concordia' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu correo y tu contraseña.');
    await user.type(screen.getByLabelText('Correo'), 'camila@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'equivocada-123');
    await user.click(screen.getByRole('button', { name: 'Entrar a Concordia' }));
    expect(await screen.findByText(/El correo o la contraseña no coinciden/)).toBeVisible();
  });

  it('shows the password on request and links to recovery and sign-up', async () => {
    const user = userEvent.setup();
    await renderRoute('/sign-in');
    const password = await screen.findByLabelText('Contraseña');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar la contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Mostrar la contraseña' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Olvidé mi contraseña' })).toHaveAttribute(
      'href',
      '/recover-password',
    );
    expect(screen.getByRole('link', { name: 'Crea tu ciudadano' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  it('offers Google when it is configured', async () => {
    const user = userEvent.setup();
    await renderRoute('/sign-in');
    await user.click(await screen.findByRole('button', { name: 'Continuar con Google' }));
    expect(supabaseMock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  });
});
