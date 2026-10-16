import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const world = {
  list_countries: { data: countryRows, error: null },
  list_regions: { data: regionRows, error: null },
};

const admin = {
  get_my_staff: { data: [{ role: 'admin', email: 'ada@ejemplo.com' }], error: null },
};
const moderator = {
  get_my_staff: { data: [{ role: 'moderator', email: 'mod@ejemplo.com' }], error: null },
};

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

const goldPrice = {
  key: 'party_founding',
  category: 'politics',
  price: 5000,
  min_price: 1,
  beneficiary: 'party_country',
  country_share_bp: 0,
  description: 'Founding a party.',
  updated_at: '2026-11-11T10:00:00Z',
  updated_by: null,
};

const warPrice = {
  ...goldPrice,
  key: 'war_authorization',
  category: 'war',
  beneficiary: 'none',
  description: 'A war authorization.',
};

const record = {
  name: 'Juan Pérez',
  email: 'juan@ejemplo.com',
  email_confirmed: true,
  signed_up_at: '2026-11-01T10:00:00Z',
  last_sign_in_at: '2026-11-11T09:00:00Z',
  country_code: 'ARG',
  region_code: 'ARG-01',
  citizen_code: 'ARG-000123',
  joined_at: '2026-11-01T10:05:00Z',
  level: 4,
  experience: 1700,
  strength: 120,
  health: 90,
  bio: 'Compro oro barato',
  avatar_path: null,
  referred_by: null,
  party: { id: 3, name: 'Partido Nuevo' },
  regiment: null,
  newspaper: null,
  companies: [],
  balances: [{ currency_code: 'GOLD', balance: 1250 }],
  sanctions: [
    {
      sanction_id: 5,
      kind: 'mute',
      reason: 'spam',
      note: 'Spam en mensajes',
      starts_at: '2026-11-11T08:00:00Z',
      ends_at: '2026-11-12T08:00:00Z',
      created_by: 'mod@ejemplo.com',
      revoked_at: null,
      revoke_note: null,
      active: true,
    },
  ],
  reports: [],
  reports_filed: 0,
  articles: [],
  notes: [],
  signals: [],
};

describe('the admin console', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('has its own sign-in, apart from the game', async () => {
    answerRpc({ ...world });
    await renderRoute('/admin');
    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crea tu ciudadano' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar a la administración' })).toBeVisible();
  });

  it('turns away a player account', async () => {
    answerRpc({ ...world, get_my_staff: { data: [], error: null } });
    setSession(fakeSession());
    await renderRoute('/admin');
    expect(
      await screen.findByRole('heading', { name: 'Esta cuenta no es del equipo' }),
    ).toBeVisible();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('admin_overview');
  });

  it('sends a staff account that opens the game to the console', async () => {
    answerRpc({
      ...world,
      ...moderator,
      get_my_citizen: { data: [], error: null },
      admin_overview: { data: null, error: { message: 'other' } },
    });
    setSession(fakeSession('mod@ejemplo.com'));
    await renderRoute('/');
    expect(await screen.findByRole('navigation', { name: 'Administración' })).toBeVisible();
    expect(screen.getByText('mod@ejemplo.com · Moderación')).toBeVisible();
  });

  it('shows moderators only the moderation sections', async () => {
    answerRpc({ ...world, ...moderator });
    setSession(fakeSession('mod@ejemplo.com'));
    await renderRoute('/admin/gold');
    const nav = await screen.findByRole('navigation', { name: 'Administración' });
    expect(within(nav).getByRole('link', { name: 'Denuncias' })).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'Sanciones' })).toBeVisible();
    expect(within(nav).queryByRole('link', { name: 'Precios en oro' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Esta sección es solo para quienes administran el juego.'),
    ).toBeVisible();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('admin_list_gold_prices');
  });

  it('shows today’s figures', async () => {
    answerRpc({
      ...world,
      ...admin,
      admin_overview: {
        data: {
          game_day: '2026-11-11',
          citizens: 1204,
          new_today: 12,
          active_24h: 340,
          waiting: 5,
          countries_in_play: 8,
          suspended: 3,
          muted: 1,
          open_reports: 4,
          open_signals: 2,
          gold_minted: 1000000,
          gold_burned: 250000,
          gold_held: 750000,
          gold_burned_today: 5000,
          gold_minted_today: 12000,
        },
        error: null,
      },
    });
    setSession(fakeSession('ada@ejemplo.com'));
    await renderRoute('/admin');
    const review = await screen.findByRole('region', { name: 'Para revisar' });
    expect(within(review).getByText('Cuentas suspendidas').nextSibling).toHaveTextContent('3');
    expect(screen.getByRole('region', { name: 'Oro' })).toHaveTextContent('7.500,00 Oro');
    expect(document.title).toBe('Resumen · Administración · Concordia');
  });

  it('sets a GOLD price and the country’s share, showing the split', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      ...admin,
      admin_list_gold_prices: { data: [goldPrice, warPrice], error: null },
      admin_set_gold_price: { data: null, error: null },
    });
    setSession(fakeSession('ada@ejemplo.com'));
    await renderRoute('/admin/gold');
    const form = await screen.findByRole('form', { name: 'Fundar un partido' });
    await user.clear(within(form).getByLabelText('Precio en oro'));
    await user.type(within(form).getByLabelText('Precio en oro'), '60');
    await user.clear(within(form).getByLabelText('Para el país (%)'));
    await user.type(within(form).getByLabelText('Para el país (%)'), '40');
    await user.type(within(form).getByLabelText('Motivo'), 'Más partidos serios');
    expect(screen.getByText('Al país: 24,00 Oro · Sale del juego: 36,00 Oro')).toBeVisible();
    await user.click(within(form).getByRole('button', { name: 'Guardar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_set_gold_price', {
      p_key: 'party_founding',
      p_price: 6000,
      p_country_share_bp: 4000,
      p_reason: 'Más partidos serios',
    });
    expect(await screen.findByText('Precio guardado.')).toBeVisible();
    const war = screen.getByRole('form', { name: 'Autorización de guerra' });
    expect(within(war).queryByLabelText('Para el país (%)')).not.toBeInTheDocument();
  });

  it('changes a balance parameter found by its key', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      ...admin,
      admin_list_params: {
        data: [
          {
            key: 'mission_reward',
            value: 100,
            description: 'GOLD hundredths for the four daily missions.',
            updated_at: '2026-11-01T10:00:00Z',
            managed: false,
          },
          {
            key: 'closed_beta',
            value: 0,
            description: 'Closed beta.',
            updated_at: '2026-11-01T10:00:00Z',
            managed: true,
          },
        ],
        error: null,
      },
      admin_set_param: { data: null, error: null },
    });
    setSession(fakeSession('ada@ejemplo.com'));
    await renderRoute('/admin/params');
    await user.type(await screen.findByLabelText('Buscar parámetro'), 'mission');
    expect(screen.queryByRole('form', { name: 'closed_beta' })).not.toBeInTheDocument();
    const form = screen.getByRole('form', { name: 'mission_reward' });
    await user.clear(within(form).getByLabelText('Valor'));
    await user.type(within(form).getByLabelText('Valor'), '200');
    await user.type(within(form).getByLabelText('Motivo'), 'Semana doble');
    await user.click(within(form).getByRole('button', { name: 'Guardar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_set_param', {
      p_key: 'mission_reward',
      p_value: 200,
      p_reason: 'Semana doble',
    });
  });

  it('finds a citizen, opens the record and sanctions them', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      ...moderator,
      admin_search_citizens: {
        data: [
          {
            name: 'Juan Pérez',
            email: 'juan@ejemplo.com',
            country_code: 'ARG',
            citizen_code: 'ARG-000123',
            level: 4,
            joined_at: '2026-11-01T10:05:00Z',
            last_sign_in_at: null,
            sanction: 'mute',
            open_reports: 1,
          },
        ],
        error: null,
      },
      admin_get_citizen: { data: record, error: null },
      admin_sanction: { data: 6, error: null },
      admin_revoke_sanction: { data: null, error: null },
    });
    setSession(fakeSession('mod@ejemplo.com'));
    await renderRoute('/admin/citizens');
    await user.type(await screen.findByLabelText('Buscar ciudadano'), 'pérez');
    await user.click(screen.getByRole('button', { name: 'Buscar ciudadano' }));
    const row = await screen.findByRole('row', { name: /Juan Pérez/ });
    expect(row).toHaveTextContent('Silenciado');
    await user.click(within(row).getByRole('link', { name: 'Juan Pérez' }));

    expect(await screen.findByRole('heading', { name: 'Ficha de Juan Pérez' })).toBeVisible();
    expect(await screen.findByText('12,50 Oro')).toBeVisible();
    const sanction = screen.getByRole('region', { name: 'Sancionar' });
    await user.click(within(sanction).getByRole('radio', { name: /^Suspender/ }));
    const duration = within(sanction).getByLabelText('Duración');
    expect(within(duration).queryByRole('option', { name: /Para siempre/ })).toBeNull();
    await user.selectOptions(duration, '168');
    await user.selectOptions(within(sanction).getByLabelText('Motivo'), 'multi_account');
    await user.type(within(sanction).getByLabelText('Mensaje para el jugador'), 'Cuatro cuentas');
    await user.click(within(sanction).getByRole('button', { name: 'Aplicar la sanción' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_sanction', {
      p_name: 'Juan Pérez',
      p_kind: 'suspension',
      p_reason: 'multi_account',
      p_note: 'Cuatro cuentas',
      p_hours: 168,
    });

    const lift = screen.getByRole('form', { name: 'Levantar: Silenciar' });
    await user.type(within(lift).getByLabelText('Por qué se levanta'), 'Malentendido');
    await user.click(within(lift).getByRole('button', { name: 'Levantar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_revoke_sanction', {
      p_sanction_id: 5,
      p_note: 'Malentendido',
    });
  });

  it('lists the countries with their numbers and schedules a change', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      ...admin,
      admin_list_countries: { data: adminCountries, error: null },
      admin_list_regions: { data: adminRegions, error: null },
      admin_schedule_country: { data: 1, error: null },
    });
    setSession(fakeSession('ada@ejemplo.com'));
    await renderRoute('/admin/world');
    const table = await screen.findByRole('table', { name: 'Países en juego' });
    const portugal = await within(table).findByRole('row', { name: /Portugal/ });
    expect(within(portugal).getByText('Se apaga el 10 de octubre de 2026')).toBeVisible();
    expect(within(table).getByRole('row', { name: /Uruguay/ })).toHaveTextContent('214');
    await user.click(screen.getByRole('switch', { name: 'Argentina en juego' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_schedule_country', {
      p_country_code: 'ARG',
      p_active: false,
    });
    expect(
      await screen.findByText('Cambio programado para la próxima medianoche del juego.'),
    ).toBeVisible();
  });

  it('shows who did what, with the state before and after', async () => {
    answerRpc({
      ...world,
      ...admin,
      admin_list_countries: { data: adminCountries, error: null },
      admin_list_log: {
        data: [
          {
            id: 2,
            actor_name: 'ada@ejemplo.com',
            action: 'set_gold_price',
            target: 'party_founding',
            before: { price: 5000, country_share_bp: 0 },
            after: { price: 6000, country_share_bp: 4000, reason: 'Más partidos serios' },
            created_at: '2026-11-11T18:00:00Z',
          },
        ],
        error: null,
      },
    });
    setSession(fakeSession('ada@ejemplo.com'));
    await renderRoute('/admin/log');
    const log = await screen.findByRole('table', { name: 'Registro de acciones' });
    const row = await within(log).findByRole('row', { name: /ada@ejemplo.com/ });
    expect(row).toHaveTextContent('Cambió un precio en oro · party_founding');
    expect(row).toHaveTextContent(
      'price: 6000, country_share_bp: 4000, reason: Más partidos serios',
    );
  });

  it('gives an account a role by email', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      ...admin,
      admin_list_team: {
        data: [
          {
            email: 'ada@ejemplo.com',
            role: 'admin',
            added_at: '2026-11-01T12:00:00Z',
            added_by: null,
            is_citizen: false,
          },
        ],
        error: null,
      },
      admin_grant_staff: { data: null, error: { message: 'staff_is_citizen' } },
      get_beta_status: { data: [{ closed: false }], error: null },
      admin_list_beta_invites: { data: [], error: null },
    });
    setSession(fakeSession('ada@ejemplo.com'));
    await renderRoute('/admin/access');
    const team = await screen.findByRole('region', { name: 'Equipo' });
    expect(within(team).queryByRole('button', { name: /Quitar a ada/ })).toBeNull();
    await user.type(within(team).getByLabelText('Correo de la cuenta'), 'juan@ejemplo.com');
    await user.click(within(team).getByRole('button', { name: 'Dar el rol' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_grant_staff', {
      p_email: 'juan@ejemplo.com',
      p_role: 'moderator',
    });
    expect(await within(team).findByRole('alert')).toHaveTextContent(
      'Esa cuenta juega. El equipo usa cuentas que no son ciudadanos.',
    );
  });
});
