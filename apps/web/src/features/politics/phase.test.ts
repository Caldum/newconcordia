import { describe, expect, it } from 'vitest';

import { electionStep } from './phase';

const election = {
  status: 'registration' as const,
  registration_closes_at: '2026-11-14T00:00:00Z',
  voting_starts_at: '2026-11-15T00:00:00Z',
};

describe('electionStep', () => {
  it('takes candidacies until they close', () => {
    expect(electionStep(election, Date.parse('2026-11-13T23:59:00Z'))).toBe('candidacies');
  });

  it('waits for the vote in the last 24 hours', () => {
    expect(electionStep(election, Date.parse('2026-11-14T00:00:00Z'))).toBe('waiting');
  });

  it('votes from the start even before the hourly job moves the status', () => {
    expect(electionStep(election, Date.parse('2026-11-15T00:10:00Z'))).toBe('voting');
  });

  it('counts during validation', () => {
    expect(electionStep({ ...election, status: 'validation' }, 0)).toBe('counting');
  });
});
