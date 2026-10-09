import { afterEach, describe, expect, it, vi } from 'vitest';

import { runJob } from './runJob';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' };
const scheduledAt = new Date('2026-10-09T03:00:00.000Z');

function respondWith(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe('runJob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the run_job RPC with the secret key and the scheduled time', async () => {
    const fetchSpy = respondWith({
      status: 'succeeded',
      job: 'day_change',
      slot: '2026-10-09T03:00:00+00:00',
    });

    await runJob('day_change', scheduledAt, env);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/run_job');
    expect(init?.method).toBe('POST');
    const headers = new Headers(init?.headers);
    expect(headers.get('apikey')).toBe('sb_secret_test');
    expect(headers.get('authorization')).toBeNull();
    expect(JSON.parse(init?.body as string)).toEqual({
      p_job: 'day_change',
      p_at: '2026-10-09T03:00:00.000Z',
    });
  });

  it('also sends a bearer token when the key is a legacy service_role JWT', async () => {
    const fetchSpy = respondWith({
      status: 'skipped',
      job: 'day_change',
      slot: '2026-10-09T03:00:00+00:00',
    });

    await runJob('day_change', scheduledAt, {
      ...env,
      SUPABASE_SECRET_KEY: 'eyJhbGciOi.legacy.jwt',
    });

    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get('authorization')).toBe('Bearer eyJhbGciOi.legacy.jwt');
  });

  it('returns the run reported by the database', async () => {
    respondWith({ status: 'skipped', job: 'day_change', slot: '2026-10-09T03:00:00+00:00' });

    await expect(runJob('day_change', scheduledAt, env)).resolves.toEqual({
      ok: true,
      run: { status: 'skipped', job: 'day_change', slot: '2026-10-09T03:00:00+00:00' },
    });
  });

  it('reports HTTP errors without throwing', async () => {
    respondWith({ message: 'permission denied' }, 401);

    await expect(runJob('day_change', scheduledAt, env)).resolves.toEqual({
      ok: false,
      reason: 'http_error',
      detail: 'HTTP 401',
    });
  });

  it('reports responses that do not match the contract', async () => {
    respondWith({ status: 'exploded' });

    const outcome = await runJob('day_change', scheduledAt, env);
    expect(outcome).toMatchObject({ ok: false, reason: 'invalid_response' });
  });

  it('reports network failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));

    await expect(runJob('day_change', scheduledAt, env)).resolves.toEqual({
      ok: false,
      reason: 'network_error',
      detail: 'network down',
    });
  });

  it('reports failures that are not Error instances', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue('socket closed');

    await expect(runJob('day_change', scheduledAt, env)).resolves.toMatchObject({
      reason: 'network_error',
      detail: 'socket closed',
    });
  });
});
