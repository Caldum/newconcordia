import { screen, within } from '@testing-library/react';
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

describe('press', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('reads an article and founds a newspaper', async () => {
    const user = userEvent.setup();
    answerRpc({
      get_my_citizen: { data: [citizenRow()], error: null },
      get_my_profile: { data: [profileRow()], error: null },
      get_my_balances: { data: balanceRows, error: null },
      list_articles: {
        data: [
          {
            article_id: 7,
            title: 'Abre el mercado',
            newspaper: 'La Voz del Plata',
            author: 'Juan Pérez',
            published_at: '2026-11-07T10:00:00Z',
            readers: 0,
            read_by_me: false,
          },
        ],
        error: null,
      },
      read_article: {
        data: [
          {
            article_id: 7,
            title: 'Abre el mercado',
            body: 'Hoy se abrió el mercado nacional.',
            newspaper: 'La Voz del Plata',
            author: 'Juan Pérez',
            published_at: '2026-11-07T10:00:00Z',
          },
        ],
        error: null,
      },
      get_my_newspaper: { data: [], error: null },
      found_newspaper: { data: 3, error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/press');
    const articles = await screen.findByRole('region', { name: 'Últimos artículos' });
    await user.click(
      await within(articles).findByRole('button', { name: 'Leer «Abre el mercado»' }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith('read_article', { p_article_id: 7 });
    expect(await within(articles).findByText('Hoy se abrió el mercado nacional.')).toBeVisible();
    const paper = screen.getByRole('region', { name: 'Tu periódico' });
    await user.type(await within(paper).findByLabelText('Nombre del periódico'), 'El Faro');
    await user.click(within(paper).getByRole('button', { name: 'Fundar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('found_newspaper', { p_name: 'El Faro' });
  });
});
