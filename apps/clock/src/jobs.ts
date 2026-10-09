/** Cron expressions in wrangler.jsonc and the database job each one triggers. */
const jobsByCron = {
  '0 3 * * *': 'day_change',
} as const satisfies Record<string, string>;

export type JobName = (typeof jobsByCron)[keyof typeof jobsByCron];

export function jobForCron(cron: string): JobName | undefined {
  return Object.hasOwn(jobsByCron, cron) ? jobsByCron[cron as keyof typeof jobsByCron] : undefined;
}
