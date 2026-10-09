import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const adminCountries = [
  {
    code: 'ARG',
    name_es: 'Argentina',
    name_en: 'Argentina',
    is_active: true,
    regions: 6,
    citizens: 3412,
    waiting: 0,
    scheduled: null,
    apply_on: null,
  },
  {
    code: 'PRT',
    name_es: 'Portugal',
    name_en: 'Portugal',
    is_active: true,
    regions: 3,
    citizens: 1102,
    waiting: 0,
    scheduled: false,
    apply_on: '2026-10-10',
  },
  {
    code: 'URY',
    name_es: 'Uruguay',
    name_en: 'Uruguay',
    is_active: false,
    regions: 0,
    citizens: 0,
    waiting: 214,
    scheduled: null,
    apply_on: null,
  },
];

const adminRegions = [
  {
    code: 'ARG-05',
    name: 'Cuyo',
    home_country_code: 'ARG',
    owner_country_code: 'ARG',
    is_enabled: true,
    scheduled: null,
    apply_on: null,
  },
  {
    code: 'PRT-01',
    name: 'Portugal Continental',
    home_country_code: 'PRT',
    owner_country_code: 'PRT',
    is_enabled: true,
    scheduled: null,
    apply_on: null,
  },
];

const logEntries = [
  {
    id: 2,
    actor_name: 'Ada Admin',
    action: 'schedule_country',
    target: 'PRT',
    before: { is_active: true },
    after: { is_active: false, apply_on: '2026-10-10' },
    created_at: '2026-10-09T18:00:00Z',
  },
];

function answer(
  isAdmin: boolean,
  schedule: { data: unknown; error: unknown } = { data: 1, error: null },
) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    am_i_admin: { data: isAdmin, error: null },
    admin_list_countries: { data: adminCountries, error: null },
    admin_list_regions: { data: adminRegions, error: null },
    admin_list_log: { data: logEntries, error: null },
    admin_list_team: {
      data: [{ name: 'Ada Admin', email: 'ada@ejemplo.com', added_at: '2026-10-01T12:00:00Z' }],
      error: null,
    },
    admin_schedule_country: schedule,
    admin_schedule_region: schedule,
  });
}

describe('AdminPage', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('lists the countries with their numbers and the scheduled changes', async () => {
    answer(true);
    setSession(fakeSession());
    await renderRoute('/admin');
    const table = await screen.findByRole('table', { name: 'Países en juego' });
    const portugal = await within(table).findByRole('row', { name: /Portugal/ });
    expect(within(portugal).getByRole('switch', { name: 'Portugal en juego' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(within(portugal).getByText('Se apaga el 10 de octubre de 2026')).toBeVisible();
    expect(within(table).getByRole('row', { name: /Uruguay/ })).toHaveTextContent('214');
    expect(screen.getByText('2 de 2 países con regiones listas')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/admin');
    expect(document.title).toBe('Administración · Concordia');
  });

  it('schedules a country change for the next day change', async () => {
    const user = userEvent.setup();
    answer(true);
    setSession(fakeSession());
    await renderRoute('/admin');
    await user.click(await screen.findByRole('switch', { name: 'Argentina en juego' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_schedule_country', {
      p_country_code: 'ARG',
      p_active: false,
    });
    expect(
      await screen.findByText('Cambio programado para la próxima medianoche del juego.'),
    ).toBeVisible();
  });

  it('switches regions, filtered by country', async () => {
    const user = userEvent.setup();
    answer(true);
    setSession(fakeSession());
    await renderRoute('/admin');
    const regions = await screen.findByRole('table', { name: 'Regiones y territorios en disputa' });
    await screen.findByRole('option', { name: 'Portugal' });
    await user.selectOptions(screen.getByLabelText('Mostrar regiones de'), 'PRT');
    expect(within(regions).queryByText('Cuyo')).not.toBeInTheDocument();
    await user.click(within(regions).getByRole('switch', { name: 'Portugal Continental activa' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_schedule_region', {
      p_region_code: 'PRT-01',
      p_enabled: false,
    });
  });

  it('shows who did what, with the state before and after', async () => {
    answer(true);
    setSession(fakeSession());
    await renderRoute('/admin');
    const log = await screen.findByRole('table', { name: 'Registro de acciones' });
    const row = await within(log).findByRole('row', { name: /Ada Admin/ });
    expect(row).toHaveTextContent('Ada Admin');
    expect(row).toHaveTextContent('Programó un cambio de país · Portugal');
    expect(row).toHaveTextContent('encendido');
    expect(row).toHaveTextContent('apagado, 10 de octubre de 2026');
    expect(screen.getByText('ada@ejemplo.com')).toBeVisible();
  });

  it('explains a change the database refused', async () => {
    const user = userEvent.setup();
    answer(true, { data: null, error: { message: 'country_not_ready' } });
    setSession(fakeSession());
    await renderRoute('/admin');
    await user.click(await screen.findByRole('switch', { name: 'Argentina en juego' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo programar el cambio.');
  });

  it('is closed to players who are not admins', async () => {
    answer(false);
    setSession(fakeSession());
    await renderRoute('/admin');
    expect(
      await screen.findByText('Esta sección es solo para el equipo de administración.'),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('admin_list_countries');
  });
});
