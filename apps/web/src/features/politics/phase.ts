interface ElectionDates {
  status: 'registration' | 'voting' | 'validation';
  registration_closes_at: string;
  voting_starts_at: string;
}

/**
 * What a player can do in an election right now: run (`candidacies`), wait for the vote (`waiting`), vote
 * (`voting`) or wait for the result (`counting`). The database moves the status hourly; the dates decide.
 */
export function electionStep(
  election: ElectionDates,
  now: number,
): 'candidacies' | 'waiting' | 'voting' | 'counting' {
  if (election.status === 'validation') return 'counting';
  if (election.status === 'voting') return 'voting';
  if (now < Date.parse(election.registration_closes_at)) return 'candidacies';
  if (now < Date.parse(election.voting_starts_at)) return 'waiting';
  return 'voting';
}
