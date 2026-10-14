import type { NationalElection } from '../../features/politics/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface ElectionScheduleProps {
  election: NationalElection;
  step: 'candidacies' | 'waiting' | 'voting' | 'counting';
}

/** Where an election stands: candidacies, waiting for the vote, voting or counting. */
export function ElectionSchedule({ election, step }: ElectionScheduleProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const when = (value: string) => formatDateTime(value, locale);
  return (
    <p>
      {step === 'candidacies'
        ? copy.candidacies(when(election.registration_closes_at), when(election.voting_starts_at))
        : step === 'waiting'
          ? copy.waiting(when(election.voting_starts_at))
          : step === 'voting'
            ? copy.voting(when(election.voting_ends_at), election.ballots, election.voters)
            : copy.counting(when(election.takes_office_at))}
    </p>
  );
}
