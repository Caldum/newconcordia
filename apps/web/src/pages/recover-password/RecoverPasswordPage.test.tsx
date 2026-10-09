import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '../../test/renderRoute';
import { resetSupabaseMock, supabaseMock } from '../../test/supabaseMock';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

describe('password recovery', () => {
  afterEach(() => {
    resetSupabaseMock();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('sends the link and names the address on the next screen', async () => {
    const user = userEvent.setup();
    await renderRoute('/recover-password');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recupera tu contraseña' }),
    ).toBeVisible();
    await user.type(screen.getByLabelText('Correo'), 'camila@');
    await user.click(screen.getByRole('button', { name: 'Enviarme el enlace' }));
    expect(screen.getByText(/Revisa el correo: falta algo/)).toBeVisible();
    await user.type(screen.getByLabelText('Correo'), 'ejemplo.com');
    await user.click(screen.getByRole('button', { name: 'Enviarme el enlace' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revisa tu correo' }),
    ).toBeVisible();
    expect(screen.getByText('camila@ejemplo.com')).toBeVisible();
    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith('camila@ejemplo.com', {
      captchaToken: 'turnstile-test-token',
      redirectTo: window.location.origin,
    });
  });

  it('lets the player ask for another link after a minute', async () => {
    sessionStorage.setItem('concordia.recover.email', 'camila@ejemplo.com');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    await renderRoute('/recover-password/sent');
    expect(await screen.findByText('¿No llegó? Puedes pedir otro en 60 s.')).toBeVisible();
    for (let second = 0; second < 60; second += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    await user.click(screen.getByRole('button', { name: 'Enviar otro correo' }));
    expect(await screen.findByText(/Te enviamos otro correo/)).toBeVisible();
    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });

  it('works without knowing the address', async () => {
    await renderRoute('/recover-password/sent');
    expect(
      await screen.findByText(
        'Si ese correo tiene una cuenta, te enviamos el enlace. Vence en 30 minutos.',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/No llegó/)).not.toBeInTheDocument();
  });
});
