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

const granaderos = {
  regiment_id: 2,
  name: 'Granaderos',
  emblem_path: null,
  leader: 'Juan Pérez',
  members: 5,
  founded_at: '2026-11-01T10:00:00Z',
};

function signIn(mine: unknown[]) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    list_regiments: { data: [granaderos], error: null },
    get_my_regiment: { data: mine, error: null },
    join_regiment: { data: null, error: null },
    found_regiment: { data: 3, error: null },
    leave_regiment: { data: null, error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
  });
  setSession(fakeSession());
}

describe('regiments', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('joins a regiment of the country or founds one', async () => {
    const user = userEvent.setup();
    signIn([]);
    await renderRoute('/regiments');
    expect(await screen.findByRole('link', { name: 'Regimientos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const list = await screen.findByRole('region', { name: 'Regimientos' });
    expect(within(list).getByText('5 integrantes · Lo lidera Juan Pérez')).toBeVisible();
    await user.click(within(list).getByRole('button', { name: 'Unirme a Granaderos' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('join_regiment', { p_regiment_id: 2 });

    const found = screen.getByRole('region', { name: 'Fundar un regimiento' });
    await user.type(within(found).getByLabelText('Nombre del regimiento'), 'Húsares');
    await user.click(within(found).getByRole('button', { name: 'Fundar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('found_regiment', { p_name: 'Húsares' });
  });

  it('lets the leader change the picture and anyone leave', async () => {
    const user = userEvent.setup();
    signIn([
      {
        regiment_id: 2,
        name: 'Granaderos',
        emblem_path: null,
        leader: 'Camila Ríos',
        is_leader: true,
        members: 5,
        joined_at: '2026-11-01T10:00:00Z',
      },
    ]);
    await renderRoute('/regiments');
    const mine = await screen.findByRole('region', { name: 'Granaderos' });
    expect(within(mine).getByText('5 integrantes · Lo lideras tú.')).toBeVisible();
    const emblem = screen.getByRole('region', { name: 'Foto del regimiento' });
    expect(within(emblem).getByLabelText('Elegir una foto')).toHaveAttribute('type', 'file');
    expect(
      within(screen.getByRole('region', { name: 'Regimientos' })).queryByRole('button'),
    ).not.toBeInTheDocument();
    await user.click(within(mine).getByRole('button', { name: 'Dejar el regimiento' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('leave_regiment');
  });
});
