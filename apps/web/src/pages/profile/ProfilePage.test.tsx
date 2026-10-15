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

// Camila joined on August 28 and has kept her first citizenship.
const citizen = citizenRow({
  joined_at: '2026-08-28T15:00:00Z',
  citizen_since: '2026-08-28T15:00:00Z',
  adaptation_ends_at: '2026-09-04T15:00:00Z',
});

const details = {
  bio: 'Soldado de la Pampa.',
  avatar_path: 'citizens/u1/a.webp',
  national_rank: 3,
  national_citizens: 120,
  party_id: 4,
  party_name: 'Partido Federal',
  party_emblem_path: null,
  regiment_id: 2,
  regiment_name: 'Granaderos',
  regiment_emblem_path: null,
  friends: 0,
  referrals: 1,
};

function signIn(profile = profileRow()) {
  answerRpc({
    get_my_citizen: { data: [citizen], error: null },
    get_my_profile: { data: [profile], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
  });
  setSession(fakeSession());
}

describe('profile', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the energy in the game bar and links to the profile', async () => {
    signIn();
    await renderRoute('/');
    const meter = await screen.findByRole('meter', { name: 'Energía' });
    expect(meter).toHaveAttribute('aria-valuetext', '80 de 100');
    expect(meter).toHaveAttribute('aria-valuenow', '80');
    expect(meter.closest('[title]')).toHaveAttribute('title', 'Comiendo: recuperas 2 cada minuto');
    expect(meter.querySelector('[data-fed]')).toHaveAttribute('data-fed', 'true');
    expect(screen.getByRole('link', { name: 'Tu perfil: Camila Ríos' })).toHaveAttribute(
      'href',
      '/profile',
    );
  });

  it('shows the appetite fainter when there is no food', async () => {
    signIn(profileRow({ next_meal_energy: null }));
    await renderRoute('/');
    const meter = await screen.findByRole('meter', { name: 'Energía' });
    expect(meter.closest('[title]')).toHaveAttribute('title', 'Sin comida no recuperas energía');
    expect(meter.querySelector('[data-fed]')).toHaveAttribute('data-fed', 'false');
  });

  it('keeps the game working when the profile does not load', async () => {
    answerRpc({
      get_my_citizen: { data: [citizenRow()], error: null },
      get_my_profile: { data: null, error: new Error('down') },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
    expect(screen.queryByRole('meter', { name: 'Energía' })).not.toBeInTheDocument();
  });

  it('shows level, health, strength, rank, damage, influence and energy', async () => {
    signIn();
    await renderRoute('/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
    expect(document.title).toBe('Camila Ríos · Concordia');
    expect(screen.getByText('En el juego desde el 28 de agosto de 2026')).toBeVisible();
    // The rank is in the header and in its own figure.
    expect(screen.getAllByText('Cabo I')).toHaveLength(2);

    const level = screen.getByRole('group', { name: 'Nivel' });
    expect(within(level).getByText('8')).toBeVisible();
    expect(within(level).getByText('6.420 de 8.100 de experiencia')).toBeVisible();
    expect(
      within(level).getByRole('meter', { name: 'Experiencia para el nivel 9' }),
    ).toHaveAttribute('aria-valuetext', '20 de 1.700');

    const health = screen.getByRole('group', { name: 'Salud' });
    expect(within(health).getByText('85')).toBeVisible();
    expect(within(health).getByRole('meter', { name: 'Salud' })).toHaveAttribute(
      'aria-valuetext',
      '85 de 100',
    );
    expect(within(health).getByText('No se recupera sola: se cura con botiquines')).toBeVisible();

    expect(within(screen.getByRole('group', { name: 'Fuerza' })).getByText('1.840')).toBeVisible();
    const rank = screen.getByRole('group', { name: 'Rango militar' });
    expect(within(rank).getByText('Cabo I')).toBeVisible();
    expect(within(rank).getByText('13.000 de 14.400 de experiencia militar')).toBeVisible();
    expect(
      within(rank).getByRole('meter', { name: 'Experiencia militar para Cabo II' }),
    ).toHaveAttribute('aria-valuetext', '900 de 2.300');
    const damage = screen.getByRole('group', { name: 'Daño total' });
    expect(within(damage).getByText('1,5 M')).toBeVisible();
    expect(within(damage).getByText('En todas tus batallas')).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: 'Influencia' })).getByText('340'),
    ).toBeVisible();
    const energy = screen.getByRole('group', { name: 'Energía' });
    expect(within(energy).getByText('80')).toBeVisible();
    expect(within(energy).getByText('Comiendo: 2 cada minuto')).toBeVisible();
  });

  it('shows where the citizen lives and their citizenship', async () => {
    signIn();
    await renderRoute('/profile');
    const record = await screen.findByRole('region', { name: 'Ciudadano' });
    expect(await within(record).findByText('Buenos Aires')).toBeVisible();
    expect(within(record).getByText('Argentina, desde el 28 de agosto de 2026')).toBeVisible();
    expect(within(record).getByText('Ciudadano con todos sus derechos')).toBeVisible();
    expect(within(record).getByText('28 de agosto de 2026')).toBeVisible();
    expect(within(record).getByText('ARG-003413')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Cambiar de país' })).toHaveAttribute(
      'href',
      '/citizenship/change',
    );
  });

  it('says when the highest rank is reached and the bar is full', async () => {
    signIn(
      profileRow({
        military_xp: 600000,
        rank_step: 75,
        rank_xp: 562500,
        next_rank_xp: null,
        energy: 100,
        food_appetite: 0,
      }),
    );
    await renderRoute('/profile');
    const rank = await screen.findByRole('group', { name: 'Rango militar' });
    expect(within(rank).getByText('General V')).toBeVisible();
    expect(
      within(rank).getByText('El rango más alto · 600.000 de experiencia militar'),
    ).toBeVisible();
    expect(within(rank).queryByRole('meter')).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Energía' })).getByText('Llena')).toBeVisible();
  });

  it('starts a new citizen at level 0 as a Novice', async () => {
    signIn(
      profileRow({
        level: 0,
        experience: 0,
        level_experience: 0,
        next_level_experience: 100,
        health: 100,
        strength: 0,
        military_xp: 0,
        rank_step: 0,
        rank_xp: 0,
        next_rank_xp: 100,
        damage: 0,
      }),
    );
    await renderRoute('/profile');
    const level = await screen.findByRole('group', { name: 'Nivel' });
    expect(within(level).getByText('0 de 100 de experiencia')).toBeVisible();
    const rank = screen.getByRole('group', { name: 'Rango militar' });
    expect(within(rank).getByText('Novato')).toBeVisible();
    expect(
      within(rank).getByRole('meter', { name: 'Experiencia militar para Milicia I' }),
    ).toHaveAttribute('aria-valuetext', '0 de 100');
  });

  it('speaks English', async () => {
    signIn();
    await renderRoute('/profile', 'en');
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
    expect(screen.getByText('In the game since August 28, 2026')).toBeVisible();
    expect(screen.getByText('6,420 of 8,100 experience')).toBeVisible();
    expect(screen.getAllByText('Corporal I')).toHaveLength(2);
    expect(screen.getByText('13,000 of 14,400 military experience')).toBeVisible();
    expect(
      screen.getByText('Does not recover on its own: heal it with medical kits'),
    ).toBeVisible();
    expect(screen.getByRole('meter', { name: 'Energy' })).toHaveAttribute(
      'aria-valuetext',
      '80 of 100',
    );
  });

  it('shows the side panel with the picture, unread badges and energy out of the maximum', async () => {
    answerRpc({
      get_my_citizen: { data: [citizen], error: null },
      get_my_profile: { data: [profileRow()], error: null },
      get_my_profile_details: { data: [details], error: null },
      count_unread_messages: { data: 3, error: null },
      count_unread_notifications: { data: 1, error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/');
    const panel = await screen.findByRole('complementary', { name: 'Tu ciudadano' });
    expect(within(panel).getByRole('link', { name: 'Tu perfil: Camila Ríos' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(
      await within(panel).findByRole('link', { name: 'Mensajes (3 sin leer)' }),
    ).toHaveAttribute('href', '/messages');
    expect(await within(panel).findByRole('link', { name: 'Avisos (1 nuevo)' })).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(within(panel).getByText('80/100')).toBeVisible();
    expect(panel.querySelector('img')).toHaveAttribute(
      'src',
      'https://pictures.test/citizens/u1/a.webp',
    );
  });

  it('shows the description, national rank, party, regiment, achievements, friends and referrals', async () => {
    const user = userEvent.setup();
    answerRpc({
      get_my_citizen: { data: [citizen], error: null },
      get_my_profile: { data: [profileRow()], error: null },
      get_my_profile_details: { data: [details], error: null },
      list_my_achievements: {
        data: [
          { achievement: 'first_shift', achieved: true, achieved_at: '2026-09-01T10:00:00Z' },
          { achievement: 'level_10', achieved: false, achieved_at: null },
        ],
        error: null,
      },
      list_my_friends: {
        data: [
          {
            name: 'Juan Pérez',
            avatar_path: null,
            country_code: 'ARG',
            status: 'incoming',
            since: '2026-11-07T10:00:00Z',
          },
        ],
        error: null,
      },
      list_my_referrals: {
        data: [
          {
            name: 'Bea Lima',
            avatar_path: null,
            country_code: 'ARG',
            joined_at: '2026-11-07T09:00:00Z',
          },
        ],
        error: null,
      },
      answer_friend: { data: null, error: null },
      report_content: { data: 1, error: null },
      request_friend: { data: 'requested', error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/profile');
    expect(await screen.findByText('Soldado de la Pampa.')).toBeVisible();
    expect(screen.getByText('Nivel 8')).toBeVisible();
    for (const link of screen.getAllByRole('link', { name: 'Editar perfil' })) {
      expect(link).toHaveAttribute('href', '/profile/edit');
    }
    const record = screen.getByRole('region', { name: 'Ciudadano' });
    expect(
      await within(record).findByText('Puesto 3 de 120 en Argentina, por experiencia'),
    ).toBeVisible();
    const affiliations = screen.getByRole('region', { name: 'Partido y regimiento' });
    expect(within(affiliations).getByRole('link', { name: 'Partido Federal' })).toBeVisible();
    expect(within(affiliations).getByRole('link', { name: 'Granaderos' })).toHaveAttribute(
      'href',
      '/regiments',
    );
    const achievements = await screen.findByRole('region', { name: 'Logros · 1 de 2' });
    expect(within(achievements).getByText('Primera jornada de trabajo')).toBeVisible();
    expect(within(achievements).getByText('Conseguido el 1 de septiembre de 2026')).toBeVisible();
    expect(within(achievements).getByText('Todavía no')).toBeVisible();

    const friends = await screen.findByRole('region', { name: 'Amigos · 0' });
    expect(await within(friends).findByText('Quiere ser tu amigo')).toBeVisible();
    await user.click(within(friends).getByRole('button', { name: 'Aceptar a Juan Pérez' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('answer_friend', {
      p_name: 'Juan Pérez',
      p_accept: true,
    });
    await user.click(within(friends).getByRole('button', { name: 'Denunciar a Juan Pérez' }));
    await user.click(within(friends).getByRole('button', { name: 'Enviar denuncia' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('report_content', {
      p_kind: 'citizen',
      p_target: 'Juan Pérez',
      p_reason: 'spam',
      p_details: '',
    });
    await user.type(within(friends).getByLabelText('Nombre del ciudadano'), 'Ana Gómez');
    await user.click(within(friends).getByRole('button', { name: 'Pedir amistad' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('request_friend', { p_name: 'Ana Gómez' });
    expect(await within(friends).findByText('Solicitud enviada.')).toBeVisible();

    const referrals = await screen.findByRole('region', { name: 'Referidos · 1' });
    expect(within(referrals).getByText('Bea Lima')).toBeVisible();
    expect(
      within(referrals).getByText('http://localhost:3000/sign-up?ref=Camila%20R%C3%ADos'),
    ).toBeVisible();
  });

  it('sends visitors to sign in', async () => {
    await renderRoute('/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  });
});
