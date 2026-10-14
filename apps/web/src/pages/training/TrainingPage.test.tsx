import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrainingCenter } from '../../features/training/queries';
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

const centers: TrainingCenter[] = [
  {
    kind: 'basic',
    level: 1,
    trained_today: true,
    energy: 10,
    fee: 0,
    strength: 5,
    injury_chance: 0.0005,
    upgrade_cost: 500,
  },
  {
    kind: 'advanced',
    level: 1,
    trained_today: false,
    energy: 15,
    fee: 50,
    strength: 5,
    injury_chance: 0.0005,
    upgrade_cost: 500,
  },
  {
    kind: 'elite',
    level: 5,
    trained_today: false,
    energy: 20,
    fee: 150,
    strength: 50,
    injury_chance: 0.0025,
    upgrade_cost: null,
  },
];

function signIn(extra: Parameters<typeof answerRpc>[0] = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_my_training: { data: centers, error: null },
    list_my_injuries: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('training', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the centers and trains once', async () => {
    const user = userEvent.setup();
    signIn({
      train: {
        data: [{ strength_gained: 50, xp_gained: 50, health_lost: 5, health: 95, energy: 80 }],
        error: null,
      },
    });
    await renderRoute('/training');
    const basic = await screen.findByRole('region', { name: 'Centro básico' });
    expect(
      within(basic).getByRole('button', { name: 'Entrenar en el centro básico' }),
    ).toBeDisabled();
    expect(within(basic).getByText(/Ya entrenaste hoy/)).toBeVisible();
    const elite = screen.getByRole('region', { name: 'Centro de élite' });
    expect(within(elite).getByText('Nivel máximo.')).toBeVisible();
    expect(within(elite).getByText(/Riesgo de lesión: 0,25/)).toBeVisible();
    await user.click(within(elite).getByRole('button', { name: 'Entrenar en el centro de élite' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('train', { p_kind: 'elite' });
    expect(
      await within(elite).findByText(
        'Ganaste 50 de fuerza, pero te lesionaste: perdiste 5 de salud.',
      ),
    ).toBeVisible();
  });

  it('upgrades a center', async () => {
    const user = userEvent.setup();
    signIn({ upgrade_training_center: { data: 2, error: null } });
    await renderRoute('/training');
    const advanced = await screen.findByRole('region', { name: 'Centro avanzado' });
    await user.click(
      within(advanced).getByRole('button', { name: /Mejorar el centro avanzado por 5,00 Oro/ }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith('upgrade_training_center', {
      p_kind: 'advanced',
      p_key: expect.any(String) as string,
    });
    expect(await within(advanced).findByText('El centro ahora es nivel 2.')).toBeVisible();
  });
});
