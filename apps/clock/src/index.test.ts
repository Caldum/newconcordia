import { createScheduledController } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from './index';

function mockDatabase(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

async function trigger(cron: string, scheduledTime = Date.parse('2026-10-09T03:00:00Z')) {
  await worker.scheduled(createScheduledController({ cron, scheduledTime }), env);
}

describe('scheduled', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the day change at 03:00 UTC and logs the outcome', async () => {
    const fetchSpy = mockDatabase({
      status: 'succeeded',
      job: 'day_change',
      slot: '2026-10-09T03:00:00+00:00',
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await trigger('0 3 * * *');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: 'info',
      message: 'job finished',
      job: 'day_change',
      status: 'succeeded',
    });
  });

  it('treats a repeated slot as success', async () => {
    mockDatabase({ status: 'skipped', job: 'day_change', slot: '2026-10-09T03:00:00+00:00' });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(trigger('0 3 * * *')).resolves.toBeUndefined();
  });

  it('fails the invocation when the job fails, so Cloudflare reports it', async () => {
    mockDatabase({
      status: 'failed',
      job: 'day_change',
      slot: '2026-10-09T03:00:00+00:00',
      error: 'simulated outage',
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(trigger('0 3 * * *')).rejects.toThrow('day_change failed');
    expect(String(error.mock.calls[0]?.[0])).toContain('simulated outage');
  });

  it('names an unknown error when a failed run carries no message', async () => {
    mockDatabase({
      status: 'failed',
      job: 'day_change',
      slot: '2026-10-09T03:00:00+00:00',
      error: null,
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(trigger('0 3 * * *')).rejects.toThrow('day_change failed: unknown error');
  });

  it('fails the invocation when the database cannot be reached', async () => {
    mockDatabase({ message: 'unavailable' }, 503);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(trigger('0 3 * * *')).rejects.toThrow('day_change failed');
  });

  it('fails loudly on a cron the Worker does not know', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(trigger('*/5 * * * *')).rejects.toThrow('No job for cron');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('fetch', () => {
  it('answers the health check', async () => {
    const response = await worker.fetch(new Request('https://clock.example/health'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ status: 'ok', service: 'concordia-clock' });
  });

  it('answers 404 to anything else', async () => {
    const response = await worker.fetch(new Request('https://clock.example/run'));
    expect(response.status).toBe(404);
  });

  it('rejects other methods on the health route', async () => {
    const response = await worker.fetch(
      new Request('https://clock.example/health', { method: 'POST' }),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });
});
