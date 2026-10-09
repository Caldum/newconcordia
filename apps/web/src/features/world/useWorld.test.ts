import { afterEach, describe, expect, it, vi } from 'vitest';

import { countryRows, regionRows } from '../../test/fixtures/world';

import { fetchWorld } from './useWorld';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }));

describe('fetchWorld', () => {
  afterEach(() => {
    rpc.mockReset();
  });

  it('indexes countries and regions by code', async () => {
    rpc.mockImplementation((name: string) =>
      Promise.resolve({ data: name === 'list_countries' ? countryRows : regionRows, error: null }),
    );
    const world = await fetchWorld();
    expect(world.countries.get('ESP')?.name_en).toBe('Spain');
    expect(world.regions.get('ARG-05')?.owner_country_code).toBe('ESP');
  });

  it('rejects responses that break the contract', async () => {
    rpc.mockResolvedValue({ data: [{ code: 'not a code' }], error: null });
    await expect(fetchWorld()).rejects.toThrow();
  });

  it('surfaces database errors', async () => {
    rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'list_regions'
          ? { data: null, error: new Error('permission denied') }
          : { data: countryRows, error: null },
      ),
    );
    await expect(fetchWorld()).rejects.toThrow('permission denied');
  });
});
