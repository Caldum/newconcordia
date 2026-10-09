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

const pending = {
  request_id: 7,
  citizen_name: 'Pierre Martin',
  from_country_code: 'ESP',
  account_age_days: 1,
  created_at: '2026-10-08T18:00:00Z',
  answer_by: '2026-10-11T18:00:00Z',
};

describe('CitizenshipRequestsPage', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('lets the Interior minister approve or reject requests', async () => {
    const user = userEvent.setup();
    let decided = false;
    answerRpc({
      get_my_citizen: { data: [citizenRow({ reviews_citizenship: true })], error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
      list_citizenship_requests: () => ({ data: decided ? [] : [pending], error: null }),
      decide_citizenship_request: () => {
        decided = true;
        return { data: null, error: null };
      },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship/requests');
    expect(await screen.findByText('Viene de España, cuenta de 1 día.')).toBeVisible();
    expect(
      screen.getByText('Si nadie responde, se aprueba el 11 de octubre, 15:00.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Aprobar el pedido de Pierre Martin' }));
    expect(await screen.findByText('Aprobaste el pedido de Pierre Martin.')).toBeVisible();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('decide_citizenship_request', {
      p_request_id: 7,
      p_approve: true,
    });
    expect(await screen.findByText('No hay pedidos pendientes.')).toBeVisible();
  });

  it('reports a decision that could not be saved', async () => {
    const user = userEvent.setup();
    answerRpc({
      get_my_citizen: { data: [citizenRow({ reviews_citizenship: true })], error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
      list_citizenship_requests: { data: [pending], error: null },
      decide_citizenship_request: { data: null, error: { message: 'request_not_found' } },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship/requests');
    await user.click(
      await screen.findByRole('button', { name: 'Rechazar el pedido de Pierre Martin' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar tu decisión.');
  });

  it('is only for the officials who review requests', async () => {
    answerRpc({
      get_my_citizen: { data: [citizenRow()], error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
      get_my_waitlist: { data: [], error: null },
      get_my_citizenship_request: { data: [], error: null },
      list_citizenship_requests: { data: [], error: null },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship/requests');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu ciudadanía' })).toBeVisible();
  });
});
