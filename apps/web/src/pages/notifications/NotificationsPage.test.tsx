import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
import { balanceRows } from '../../test/fixtures/ledger';
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

describe('notifications', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the latest events with a count in the navigation and marks them read', async () => {
    const user = userEvent.setup();
    answerRpc({
      get_my_citizen: { data: [citizenRow()], error: null },
      get_my_profile: { data: [profileRow()], error: null },
      get_my_balances: { data: balanceRows, error: null },
      count_unread_notifications: { data: 2, error: null },
      list_my_notifications: {
        data: [
          {
            notification_id: 2,
            kind: 'bill_presented',
            payload: { bill_id: 4, title: 'IVA al 7 %', kind: 'taxes' },
            created_at: '2026-11-07T11:00:00Z',
            unread: true,
          },
          {
            notification_id: 1,
            kind: 'injury',
            payload: { cause: 'training', health_lost: 5, health_after: 95 },
            created_at: '2026-11-07T10:00:00Z',
            unread: true,
          },
        ],
        error: null,
      },
      mark_notifications_seen: { data: null, error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/notifications');
    expect(await screen.findByRole('link', { name: 'Avisos (2 nuevos)' })).toBeVisible();
    expect(await screen.findByText(/Se presentó el proyecto «IVA al 7 %»/)).toBeVisible();
    expect(screen.getByText(/perdiste 5 de salud y quedaste en 95/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Marcar todo como leído' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('mark_notifications_seen');
    expect(await screen.findByText('Todo está leído.')).toBeVisible();
  });
});
