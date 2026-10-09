import { jobForCron } from './jobs';
import { log } from './log';
import { runJob } from './runJob';

const service = 'concordia-clock';

export default {
  async scheduled(controller, env) {
    const job = jobForCron(controller.cron);
    if (!job) {
      log('error', 'unknown cron', { cron: controller.cron });
      throw new Error(`No job for cron "${controller.cron}"`);
    }

    const scheduledAt = new Date(controller.scheduledTime);
    const startedAt = Date.now();
    const outcome = await runJob(job, scheduledAt, env);
    const durationMs = Date.now() - startedAt;

    if (outcome.ok && outcome.run.status !== 'failed') {
      log('info', 'job finished', {
        job,
        status: outcome.run.status,
        slot: outcome.run.slot,
        durationMs,
      });
      return;
    }

    const detail = outcome.ok
      ? (outcome.run.error ?? 'unknown error')
      : `${outcome.reason}: ${outcome.detail}`;
    log('error', 'job failed', { job, scheduledAt: scheduledAt.toISOString(), detail, durationMs });
    // Throwing marks the invocation as failed in Cloudflare, which is what the alerts watch.
    throw new Error(`${job} failed: ${detail}`);
  },

  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== '/health') return Promise.resolve(new Response('Not found', { status: 404 }));
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return Promise.resolve(new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } }));
    }
    return Promise.resolve(
      Response.json({ status: 'ok', service }, { headers: { 'cache-control': 'no-store' } }),
    );
  },
} satisfies ExportedHandler<Env>;
