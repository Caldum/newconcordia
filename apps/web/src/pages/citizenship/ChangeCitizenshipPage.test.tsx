import { screen } from '@testing-library/react';
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

type Answer =
  { data: unknown; error: unknown } | ((args: unknown) => { data: unknown; error: unknown });

function answer(overrides: Record<string, Answer> = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    get_my_waitlist: { data: [], error: null },
    get_my_citizenship_request: { data: [], error: null },
    get_citizenship_rules: {
      data: [{ country_code: 'ESP', mode: 'review', election_wait_days: 7, answer_hours: 72 }],
      error: null,
    },
    request_citizenship: { data: [{ request_id: 9, status: 'pending' }], error: null },
    ...overrides,
  });
}

describe('ChangeCitizenshipPage', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('shows what the other country asks and sends the request', async () => {
    const user = userEvent.setup();
    answer();
    setSession(fakeSession());
    await renderRoute('/citizenship/change');
    expect(await screen.findByText('Hoy: Argentina')).toBeVisible();
    await user.click(await screen.findByRole('radio', { name: 'Argentina' }));
    expect(
      screen.getByText('Ya tienes la ciudadanía de Argentina. Elige otro país.'),
    ).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'España' }));
    expect(await screen.findByRole('heading', { name: 'Qué pide España' })).toBeVisible();
    expect(screen.getByText('Revisión del ministro del Interior')).toBeVisible();
    expect(screen.getByText('Se aprueba en 72 h')).toBeVisible();
    expect(screen.getByText('Dejas los cargos que tengas en Argentina.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Pedir la ciudadanía de España' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido enviado' })).toBeVisible();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('request_citizenship', { p_country_code: 'ESP' });
  });

  it('goes back to the citizenship when the change is approved at once', async () => {
    const user = userEvent.setup();
    answer({
      request_citizenship: { data: [{ request_id: 9, status: 'approved' }], error: null },
      get_citizenship_rules: {
        data: [{ country_code: 'ESP', mode: 'automatic', election_wait_days: 7, answer_hours: 72 }],
        error: null,
      },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship/change');
    await user.click(await screen.findByRole('radio', { name: 'España' }));
    expect(await screen.findByText('Aprobación automática')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Pedir la ciudadanía de España' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu ciudadanía' })).toBeVisible();
  });

  it('asks for a country and explains a refused request', async () => {
    const user = userEvent.setup();
    answer({ request_citizenship: { data: null, error: { message: 'request_pending' } } });
    setSession(fakeSession());
    await renderRoute('/citizenship/change');
    await user.click(await screen.findByRole('button', { name: 'Pedir la ciudadanía' }));
    expect(screen.getByText('Elige el país donde vas a empezar.')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'España' }));
    await user.click(screen.getByRole('button', { name: 'Pedir la ciudadanía de España' }));
    expect(
      await screen.findByText('Ya tienes un pedido pendiente. Cancélalo antes de pedir otro.'),
    ).toBeVisible();
  });

  it('waits 30 days between changes', async () => {
    answer({
      get_my_citizen: {
        data: [citizenRow({ next_change_from: '2099-02-01T15:00:00Z' })],
        error: null,
      },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship/change');
    expect(
      await screen.findByText('Puedes volver a cambiar de país desde el 1 de febrero de 2099.'),
    ).toBeVisible();
    expect(screen.queryByRole('radio', { name: 'España' })).not.toBeInTheDocument();
  });
});
