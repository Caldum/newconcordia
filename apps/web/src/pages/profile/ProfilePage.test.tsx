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

  it('shows level, strength, damage with rank, influence and energy', async () => {
    signIn();
    await renderRoute('/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
    expect(document.title).toBe('Camila Ríos · Concordia');
    expect(screen.getByText('En el juego desde el 28 de agosto de 2026')).toBeVisible();

    const level = screen.getByRole('group', { name: 'Nivel' });
    expect(within(level).getByText('26')).toBeVisible();
    expect(within(level).getByText('6.420 de 6.760 de experiencia')).toBeVisible();
    expect(
      within(level).getByRole('meter', { name: 'Experiencia para el nivel 27' }),
    ).toHaveAttribute('aria-valuetext', '170 de 510');

    expect(within(screen.getByRole('group', { name: 'Fuerza' })).getByText('1.840')).toBeVisible();
    const damage = screen.getByRole('group', { name: 'Daño total' });
    expect(within(damage).getByText('1,5 M')).toBeVisible();
    expect(within(damage).getByText('Rango 12 · el 13 llega con 1,69 M')).toBeVisible();
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
        rank: 20,
        damage: 4000000,
        next_rank_damage: null,
        energy: 100,
        next_energy_at: null,
      }),
    );
    await renderRoute('/profile');
    const damage = await screen.findByRole('group', { name: 'Daño total' });
    expect(within(damage).getByText('Rango 20, el más alto')).toBeVisible();
    expect(within(screen.getByRole('group', { name: 'Energía' })).getByText('Llena')).toBeVisible();
  });

  it('speaks English', async () => {
    signIn();
    await renderRoute('/profile', 'en');
    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Ríos' })).toBeVisible();
    expect(screen.getByText('In the game since August 28, 2026')).toBeVisible();
    expect(screen.getByText('6,420 of 6,760 experience')).toBeVisible();
    expect(screen.getByText('Rank 12 · rank 13 at 1.69M')).toBeVisible();
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
