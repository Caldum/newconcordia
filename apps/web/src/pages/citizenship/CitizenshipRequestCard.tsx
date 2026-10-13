import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import type { RequestToReview } from '../../features/citizenship/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './CitizenshipPage.module.css';
import { requestsMessages as messages } from './messages';

interface CitizenshipRequestCardProps {
  request: RequestToReview;
  onDecide: (approve: boolean) => void;
}

/** Who asks, where from, by when it is approved by default, and the decision. */
export function CitizenshipRequestCard({ request, onDecide }: CitizenshipRequestCardProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  return (
    <Panel className={styles.request} aria-label={request.citizen_name}>
      <div>
        <h3 className="at-title-3">{request.citizen_name}</h3>
        <p>{copy.from(countryName(request.from_country_code), request.account_age_days)}</p>
        <p>{copy.answerBy(formatDateTime(request.answer_by, locale))}</p>
      </div>
      <div className={styles.requestActions}>
        <Button
          aria-label={copy.approveLabel(request.citizen_name)}
          onClick={() => {
            onDecide(true);
          }}
        >
          {copy.approve}
        </Button>
        <Button
          variant="secondary"
          aria-label={copy.rejectLabel(request.citizen_name)}
          onClick={() => {
            onDecide(false);
          }}
        >
          {copy.reject}
        </Button>
      </div>
    </Panel>
  );
}
