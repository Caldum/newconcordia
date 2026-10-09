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

const day = 24 * 60 * 60 * 1000;

function answer(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    get_my_waitlist: { data: [], error: null },
    get_my_citizenship_request: { data: [], error: null },
    leave_waitlist: { data: null, error: null },
    cancel_citizenship_request: { data: null, error: null },
    ...overrides,
  });
}

describe('CitizenshipPage', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('welcomes a new citizen with the document and the first-week limits', async () => {
    answer();
    setSession(fakeSession());
    await renderRoute('/citizenship?welcome=true');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Te damos la bienvenida a Argentina, Camila Ríos.',
      }),
    ).toBeVisible();
    expect(
      screen.getByText('Desde hoy tienes la ciudadanía de Argentina y vives en Buenos Aires.'),
    ).toBeVisible();
    expect(
      screen.getByRole('article', { name: 'Documento de ciudadanía, República Argentina' }),
    ).toBeVisible();
    expect(screen.getByText('ARG-003413')).toBeVisible();
    expect(screen.getByText('Día 3 de 7')).toBeVisible();
    expect(screen.getByText('Tu daño en guerra cuenta a la mitad')).toBeVisible();
    expect(screen.getByText('Todavía no votas en elecciones')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Entrar a mi país' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Bienvenida · Concordia');
  });

  it('shows the waitlist and lets the player stop waiting', async () => {
    const user = userEvent.setup();
    answer({
      get_my_waitlist: {
        data: [{ country_code: 'URY', joined_at: '2026-10-08T15:00:00Z', place: 215 }],
        error: null,
      },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship');
    expect(
      await screen.findByText(/Esperas a Uruguay: eres la persona 215 de la lista/),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Dejar de esperar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('leave_waitlist');
  });

  it('shows a pending change with its deadline and lets the player cancel it', async () => {
    const user = userEvent.setup();
    answer({
      get_my_citizenship_request: {
        data: [
          {
            request_id: 4,
            to_country_code: 'ESP',
            status: 'pending',
            created_at: '2026-10-08T18:00:00Z',
            decided_at: null,
            answer_by: '2026-10-11T18:00:00Z',
          },
        ],
        error: null,
      },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship');
    expect(
      await screen.findByText(
        'Pediste la ciudadanía de España. Si nadie responde antes, se aprueba el 11 de octubre, 15:00.',
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancelar el pedido' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('cancel_citizenship_request');
  });

  it('after a change, says when the next one and the vote are possible', async () => {
    const changed = new Date(Date.now() - 2 * day).toISOString();
    answer({
      get_my_citizen: {
        data: [
          citizenRow({
            joined_at: new Date(Date.now() - 60 * day).toISOString(),
            adaptation_ends_at: new Date(Date.now() - 53 * day).toISOString(),
            citizen_since: changed,
            votes_in_elections_from: '2099-01-01T15:00:00Z',
            next_change_from: '2099-02-01T15:00:00Z',
            reviews_citizenship: true,
          }),
        ],
        error: null,
      },
      get_my_citizenship_request: {
        data: [
          {
            request_id: 5,
            to_country_code: 'ESP',
            status: 'rejected',
            created_at: changed,
            decided_at: changed,
            answer_by: changed,
          },
        ],
        error: null,
      },
    });
    setSession(fakeSession());
    await renderRoute('/citizenship');
    expect(
      await screen.findByText('Votas en elecciones desde el 1 de enero de 2099.'),
    ).toBeVisible();
    expect(
      screen.getByText('Puedes volver a cambiar de país desde el 1 de febrero de 2099.'),
    ).toBeVisible();
    expect(await screen.findByText('España rechazó tu pedido de ciudadanía.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Cambiar de país' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver pedidos de ciudadanía' })).toHaveAttribute(
      'href',
      '/citizenship/requests',
    );
  });

  it('sends visitors to sign in', async () => {
    await renderRoute('/citizenship');
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  });
});
