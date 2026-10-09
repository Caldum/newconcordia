import { AuthApiError } from '@supabase/auth-js';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readSignupDraft, saveSignupDraft } from '../../features/auth/signupDraft';
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

describe('email links', () => {
  beforeEach(() => {
    answerRpc({
      get_my_citizen: {
        data: [citizenRow()],
        error: null,
      },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
      get_my_waitlist: { data: [], error: null },
      get_my_citizenship_request: { data: [], error: null },
    });
  });

  afterEach(() => {
    resetSupabaseMock();
    sessionStorage.clear();
  });

  it('confirms the email and opens the game', async () => {
    saveSignupDraft({
      email: 'camila@ejemplo.com',
      citizenName: 'Camila Ríos',
      countryCode: 'ARG',
      waitlistCountryCode: null,
      signupKey: 'b'.repeat(64),
    });
    supabaseMock.auth.verifyOtp.mockImplementationOnce(() => {
      setSession(fakeSession());
      return Promise.resolve({ data: {}, error: null });
    });
    await renderRoute('/auth/confirm?token_hash=hash-1&type=email');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Te damos la bienvenida a Argentina, Camila Ríos.',
      }),
    ).toBeVisible();
    expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash-1',
      type: 'email',
    });
    expect(readSignupDraft()).toBeNull();
  });

  it('takes a recovery link to the new password', async () => {
    supabaseMock.auth.verifyOtp.mockImplementationOnce(() => {
      setSession(fakeSession(), 'PASSWORD_RECOVERY');
      return Promise.resolve({ data: {}, error: null });
    });
    await renderRoute('/auth/confirm?token_hash=hash-2&type=recovery');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crea una contraseña nueva' }),
    ).toBeVisible();
  });

  it('explains an expired link and offers the way back', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('expired', 403, 'otp_expired'),
    });
    await renderRoute('/auth/confirm?token_hash=hash-3&type=recovery');
    expect(await screen.findByText('El enlace venció o ya se usó. Pide uno nuevo.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Pedir otro enlace' })).toHaveAttribute(
      'href',
      '/recover-password',
    );
  });

  it('rejects a link without its token', async () => {
    await renderRoute('/auth/confirm?type=email');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No pudimos usar el enlace' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    expect(supabaseMock.auth.verifyOtp).not.toHaveBeenCalled();
  });
});

describe('Google callback', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('explains a sign-in that did not finish', async () => {
    await renderRoute('/auth/callback?error=access_denied');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No pudimos entrar con Google' }),
    ).toBeVisible();
  });

  it('sends a new Google account to create its citizen', async () => {
    answerRpc({
      get_my_citizen: { data: [], error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
      get_my_waitlist: { data: [], error: null },
      get_my_citizenship_request: { data: [], error: null },
    });
    setSession(fakeSession('tomas@gmail.com'));
    await renderRoute('/auth/callback?code=abc');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crea tu ciudadano' }),
    ).toBeVisible();
    expect(screen.getByText('Entraste como tomas@gmail.com.')).toBeVisible();
  });
});
