import { AuthApiError } from '@supabase/auth-js';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '../../test/renderRoute';
import { fakeSession, resetSupabaseMock, setSession, supabaseMock } from '../../test/supabaseMock';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

describe('NewPasswordPage', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('saves the new password and closes the other sessions', async () => {
    const user = userEvent.setup();
    setSession(fakeSession(), 'PASSWORD_RECOVERY');
    await renderRoute('/new-password');
    expect(await screen.findByText('Para camila@ejemplo.com')).toBeVisible();
    await user.type(screen.getByLabelText('Contraseña nueva'), 'otra-clave-larga');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'otra-clave-larg');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(screen.getByText('Las dos contraseñas no coinciden.')).toBeVisible();
    expect(screen.getByLabelText('Repite la contraseña')).toHaveFocus();
    await user.type(screen.getByLabelText('Repite la contraseña'), 'a');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ya puedes entrar' }),
    ).toBeVisible();
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'otra-clave-larga' });
    expect(supabaseMock.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('rejects short passwords and repeats of the old one', async () => {
    const user = userEvent.setup();
    setSession(fakeSession(), 'PASSWORD_RECOVERY');
    supabaseMock.auth.updateUser.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('same', 422, 'same_password'),
    });
    await renderRoute('/new-password');
    await user.type(await screen.findByLabelText('Contraseña nueva'), 'corta');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(screen.getByText('Usa al menos 10 caracteres.')).toBeVisible();
    await user.type(screen.getByLabelText('Contraseña nueva'), '-pero-vieja');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'corta-pero-vieja');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(
      await screen.findByText('La contraseña nueva tiene que ser distinta de la anterior.'),
    ).toBeVisible();
  });

  it('asks for a new link when there is no recovery session', async () => {
    await renderRoute('/new-password');
    expect(await screen.findByText(/abre el enlace del correo/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Pedir otro enlace' })).toHaveAttribute(
      'href',
      '/recover-password',
    );
  });
});
