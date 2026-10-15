import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
import { profileRow } from '../../test/fixtures/profile';
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

function signIn() {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_profile_details: {
      data: [
        {
          bio: 'Hola',
          avatar_path: 'citizens/u1/a.webp',
          national_rank: 1,
          national_citizens: 1,
          party_id: null,
          party_name: null,
          party_emblem_path: null,
          regiment_id: null,
          regiment_name: null,
          regiment_emblem_path: null,
          friends: 0,
          referrals: 0,
        },
      ],
      error: null,
    },
    set_my_bio: { data: null, error: null },
    set_my_avatar: { data: 'citizens/u1/old.webp', error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
  });
  setSession(fakeSession());
}

describe('edit profile', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('saves the description and removes the picture', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/profile/edit');
    expect(await screen.findByRole('heading', { level: 1, name: 'Editar perfil' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Información' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const description = await screen.findByRole('region', { name: 'Descripción' });
    const field = within(description).getByLabelText('Sobre ti');
    expect(field).toHaveValue('Hola');
    await user.clear(field);
    await user.type(field, 'Soldado de la Pampa.');
    expect(within(description).getByText('Te quedan 480 caracteres.')).toBeVisible();
    await user.click(within(description).getByRole('button', { name: 'Guardar descripción' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('set_my_bio', {
      p_bio: 'Soldado de la Pampa.',
    });
    expect(await within(description).findByText('Tu descripción está guardada.')).toBeVisible();

    const picture = screen.getByRole('region', { name: 'Foto de perfil' });
    expect(within(picture).getByLabelText('Elegir una foto')).toHaveAttribute('type', 'file');
    await user.click(within(picture).getByRole('button', { name: 'Quitar la foto' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('set_my_avatar', {});
    // The replaced picture is deleted so the folder keeps room.
    expect(supabaseMock.storage.remove).toHaveBeenCalledWith('citizens/u1/old.webp');
  });

  it('refuses a description over 500 characters', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/profile/edit');
    const description = await screen.findByRole('region', { name: 'Descripción' });
    const field = within(description).getByLabelText('Sobre ti');
    await user.clear(field);
    await user.click(field);
    await user.paste('a'.repeat(501));
    expect(within(description).getByText('Usa 500 caracteres como máximo.')).toBeVisible();
    expect(within(description).getByRole('button', { name: 'Guardar descripción' })).toBeDisabled();
  });

  it('changes the email and the password', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/profile/edit/security');
    const email = await screen.findByRole('region', { name: 'Correo electrónico' });
    expect(within(email).getByText('Ahora usas camila@ejemplo.com.')).toBeVisible();
    await user.type(within(email).getByLabelText('Correo nuevo'), 'camila@nuevo.com');
    await user.click(within(email).getByRole('button', { name: 'Cambiar correo' }));
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith(
      { email: 'camila@nuevo.com' },
      expect.anything(),
    );
    expect(
      await within(email).findByText(
        'Te enviamos un enlace a camila@nuevo.com. El cambio se aplica cuando lo abras.',
      ),
    ).toBeVisible();

    const password = screen.getByRole('region', { name: 'Contraseña' });
    await user.type(within(password).getByLabelText('Contraseña nueva'), 'una-clave-larga');
    await user.type(within(password).getByLabelText('Repite la contraseña'), 'una-clave-larga');
    await user.click(within(password).getByRole('button', { name: 'Cambiar contraseña' }));
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'una-clave-larga' });
    expect(supabaseMock.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
    expect(
      await within(password).findByText(
        'Guardamos tu contraseña y cerramos las sesiones de otros dispositivos.',
      ),
    ).toBeVisible();
  });
});
