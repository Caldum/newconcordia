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

const world = {
  list_countries: { data: countryRows, error: null },
  list_regions: { data: regionRows, error: null },
};

const report = {
  report_id: 9,
  target_kind: 'article',
  target_id: '7',
  reason: 'abuse',
  details: 'Insulta a otros',
  status: 'open',
  created_at: '2026-11-07T10:00:00Z',
  reporter_name: 'Ana Gómez',
  target_author: 'Juan Pérez',
  target_title: 'Un insulto',
  target_excerpt: 'Texto ofensivo',
  target_hidden: false,
  reports_on_target: 2,
  resolution: null,
  target_picture: null,
};

const citizenReport = {
  ...report,
  report_id: 10,
  target_kind: 'citizen',
  target_id: 'u2',
  target_author: 'Juan Pérez',
  target_title: null,
  target_excerpt: 'Descripción ofensiva',
  reports_on_target: 1,
  target_picture: 'citizens/u2/a.webp',
};

describe('terms, moderation and the closed beta', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('asks to accept the terms and privacy in force before playing', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      get_my_citizen: { data: [citizenRow()], error: null },
      get_my_profile: { data: [profileRow()], error: null },
      get_my_legal_status: {
        data: [
          { document: 'terms', version: 2, accepted: false },
          { document: 'privacy', version: 1, accepted: true },
        ],
        error: null,
      },
      accept_legal: { data: null, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/profile');
    const gate = await screen.findByRole('region', { name: 'Antes de seguir' });
    expect(within(gate).getByText(/Actualizamos estos documentos/)).toBeVisible();
    expect(
      within(gate).getByRole('link', { name: 'Términos y condiciones (versión 2)' }),
    ).toHaveAttribute('href', '/terms');
    await user.click(within(gate).getByRole('button', { name: 'Aceptar y seguir' }));
    expect(within(gate).getByText('Marca la casilla para aceptar.')).toBeVisible();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('accept_legal', expect.anything());
    await user.click(
      within(gate).getByLabelText('Leí y acepto los términos y la política de privacidad.'),
    );
    await user.click(within(gate).getByRole('button', { name: 'Aceptar y seguir' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('accept_legal', {
      p_terms_version: 2,
      p_privacy_version: 1,
    });
  });

  it('shows the terms with the version in force to anyone', async () => {
    answerRpc({
      ...world,
      get_legal_versions: { data: [{ terms_version: 3, privacy_version: 1 }], error: null },
    });
    await renderRoute('/terms');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Términos y condiciones' }),
    ).toBeVisible();
    expect(await screen.findByText('Versión 3')).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Juego limpio' })).toBeVisible();
  });

  it('reports an article once read', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      get_my_citizen: { data: [citizenRow()], error: null },
      get_my_profile: { data: [profileRow()], error: null },
      list_articles: {
        data: [
          {
            article_id: 7,
            title: 'Un insulto',
            newspaper: 'El Faro',
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
            title: 'Un insulto',
            body: 'Texto ofensivo',
            newspaper: 'El Faro',
            author: 'Juan Pérez',
            published_at: '2026-11-07T10:00:00Z',
          },
        ],
        error: null,
      },
      get_my_newspaper: { data: [], error: null },
      report_content: { data: 1, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/press');
    const articles = await screen.findByRole('region', { name: 'Últimos artículos' });
    await user.click(await within(articles).findByRole('button', { name: 'Leer «Un insulto»' }));
    await user.click(
      await within(articles).findByRole('button', { name: 'Denunciar el artículo «Un insulto»' }),
    );
    const form = within(articles).getByRole('form', { name: 'Denunciar a la moderación' });
    await user.selectOptions(within(form).getByLabelText('Motivo'), 'abuse');
    await user.type(within(form).getByLabelText('Detalles (opcional)'), 'Insulta a otros');
    await user.click(within(form).getByRole('button', { name: 'Enviar denuncia' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('report_content', {
      p_kind: 'article',
      p_target: '7',
      p_reason: 'abuse',
      p_details: 'Insulta a otros',
    });
    expect(
      await within(articles).findByText('Gracias. La moderación lo va a revisar.'),
    ).toBeVisible();
  });

  it('lets moderators hide what was reported and run the closed beta', async () => {
    const user = userEvent.setup();
    answerRpc({
      ...world,
      get_my_citizen: { data: [citizenRow()], error: null },
      am_i_admin: { data: true, error: null },
      admin_list_countries: { data: [], error: null },
      admin_list_regions: { data: [], error: null },
      admin_list_reports: { data: [report, citizenReport], error: null },
      admin_resolve_report: { data: null, error: null },
      get_beta_status: { data: [{ closed: false }], error: null },
      admin_list_beta_invites: {
        data: [
          {
            email: 'bea@example.com',
            note: 'Amiga',
            invited_by: 'Ada Admin',
            created_at: '2026-11-07T10:00:00Z',
            used_at: null,
          },
        ],
        error: null,
      },
      admin_set_closed_beta: { data: null, error: null },
      admin_invite_beta: { data: null, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/admin');
    const reports = await screen.findByRole('region', { name: 'Denuncias' });
    expect(await within(reports).findByText('Texto ofensivo')).toBeVisible();
    const [articleReport, citizenReported] = within(reports).getAllByRole('listitem');
    if (!articleReport || !citizenReported) throw new Error('two reports expected');
    expect(within(articleReport).getByText(/Denunció Ana Gómez/)).toBeVisible();
    expect(
      within(articleReport).queryByRole('button', { name: 'Quitar foto y descripción' }),
    ).toBeNull();
    await user.type(within(articleReport).getByLabelText('Nota de la decisión'), 'Insultos');
    await user.click(within(articleReport).getByRole('button', { name: 'Ocultar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_resolve_report', {
      p_report_id: 9,
      p_action: 'hide',
      p_note: 'Insultos',
    });
    expect(within(citizenReported).getByText('Descripción ofensiva')).toBeVisible();
    expect(within(citizenReported).queryByRole('button', { name: 'Ocultar' })).toBeNull();
    await user.click(
      within(citizenReported).getByRole('button', { name: 'Quitar foto y descripción' }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_resolve_report', {
      p_report_id: 10,
      p_action: 'clear_profile',
      p_note: '',
    });

    const beta = screen.getByRole('region', { name: 'Beta cerrada' });
    expect(
      await within(beta).findByText('El juego está abierto: cualquiera puede crear su ciudadano.'),
    ).toBeVisible();
    await user.click(within(beta).getByRole('button', { name: 'Cerrar la beta' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_set_closed_beta', { p_closed: true });
    await user.type(within(beta).getByLabelText('Correo a invitar'), 'zoe@example.com');
    await user.click(within(beta).getByRole('button', { name: 'Invitar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_invite_beta', {
      p_email: 'zoe@example.com',
      p_note: '',
    });
    expect(
      within(beta).getByRole('button', { name: 'Retirar la invitación de bea@example.com' }),
    ).toBeVisible();
  });

  it('tells visitors when the beta is closed', async () => {
    answerRpc({ ...world, get_beta_status: { data: [{ closed: true }], error: null } });
    await renderRoute('/sign-up');
    expect(
      await screen.findByText(
        'Concordia está en beta cerrada: solo puedes crear tu ciudadano con un correo invitado.',
      ),
    ).toBeVisible();
  });
});
