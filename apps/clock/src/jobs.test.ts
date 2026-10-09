import { describe, expect, it } from 'vitest';

import { jobForCron } from './jobs';

describe('jobForCron', () => {
  it('maps the 03:00 UTC trigger to the day change', () => {
    expect(jobForCron('0 3 * * *')).toBe('day_change');
  });

  it('returns undefined for a cron the Worker does not know', () => {
    expect(jobForCron('*/5 * * * *')).toBeUndefined();
  });
});
