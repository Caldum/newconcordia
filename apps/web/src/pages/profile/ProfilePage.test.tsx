import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
import { profileRow } from '../../test/fixtures/profile';
import { countryRows, regionRows } from '../../test/fixtures/world';
import { renderRoute } from '../../test/renderRoute';
import { answerRpc, fakeSession, resetSupabaseMock, setSession } from '../../test/supabaseMock';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

// Camila joined on August 28 and has kept her first citizenship.
const citizen = citizenRow({
  joined_at: '2026-08-28T15:00:00Z',
  citizen_since: '2026-08-28T15:00:00Z',
});

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
    expect(meter.closest('[title]')).toHaveAttribute('title', 'Se recarga 10 por hora');
    expect(screen.getByRole('link', { name: 'Tu perfil: Camila Ríos' })).toHaveAttribute(
      'href',
      '/profile',
    );
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
    expect(within(energy).getByText('Se recarga 10 por hora, hasta 100')).toBeVisible();
  });

  it('shows where the citizen lives and their citizenship', async () => {
    signIn();
    await renderRoute('/profile');
    const path = await screen.findByRole('region', { name: 'Trayectoria' });
    expect(await within(path).findByText('Buenos Aires')).toBeVisible();
    expect(within(path).getByText('Argentina, desde el 28 de agosto de 2026')).toBeVisible();
    expect(within(path).getByText('ARG-003413')).toBeVisible();
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
        next_energy_at: null,
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

  it('sends visitors to sign in', async () => {
    await renderRoute('/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  });
});
