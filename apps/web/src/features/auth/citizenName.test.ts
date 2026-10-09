import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetSupabaseMock, supabaseMock } from '../../test/supabaseMock';

import { checkCitizenName, isValidCitizenName } from './citizenName';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

describe('citizen names', () => {
  afterEach(() => {
    resetSupabaseMock();
  });

  it('follows the same format rules as the database', () => {
    for (const name of ['Camila Ríos', 'J. Ríos', "Jean-Luc O'Neill", 'Ana2']) {
      expect(isValidCitizenName(name)).toBe(true);
    }
    for (const name of ['Al', 'a'.repeat(25), 'Camila  Ríos', ' Camila', 'Camila_Ríos']) {
      expect(isValidCitizenName(name)).toBe(false);
    }
    expect(isValidCitizenName('Camila Ríos'.normalize('NFD'))).toBe(false);
  });

  it('asks the database whether a name is free, with the sign-up key', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'taken', error: null });
    await expect(checkCitizenName('Camila Ríos', 'k'.repeat(64))).resolves.toBe('taken');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('check_citizen_name', {
      p_name: 'Camila Ríos',
      p_signup_key: 'k'.repeat(64),
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error: new Error('down') });
    await expect(checkCitizenName('Camila Ríos')).rejects.toThrow('down');
  });
});
