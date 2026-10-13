import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { cancelCitizenshipRequest } from '../../features/citizenship/api';
import { useMyCitizenshipRequest } from '../../features/citizenship/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { formatDate, formatDateTime, useLocale, useMessages } from '../../i18n';
import { useNow } from '../../lib/useNow';

import styles from './CitizenshipPage.module.css';
import { messages } from './messages';

/**
 * Changing country: the pending request and cancelling it, the last refusal, when the next change is
 * possible, and, for officials, the requests to review.
 */
export function CitizenshipChangePanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const request = useMyCitizenshipRequest().data;
  const cancel = useGameAction(() => cancelCitizenshipRequest());
  const now = useNow();
  const nextChange = citizen.next_change_from;
  const changeLater = nextChange !== null && now < Date.parse(nextChange);

  return (
    <Panel className={styles.panel} aria-labelledby="change-title">
      <h2 id="change-title" className="at-title-3">
        {copy.requestTitle}
      </h2>
      {request?.status === 'pending' ? (
        <>
          <p>
            {copy.requestPending(
              countryName(request.to_country_code),
              formatDateTime(request.answer_by, locale),
            )}
          </p>
          <div>
            <Button
              variant="secondary"
              disabled={cancel.pending}
              onClick={() => {
                cancel.run();
              }}
            >
              {copy.cancelRequest}
            </Button>
          </div>
        </>
      ) : (
        <>
          {request?.status === 'rejected' ? (
            <Note tone="warning">{copy.requestRejected(countryName(request.to_country_code))}</Note>
          ) : null}
          {changeLater ? (
            <p>{copy.nextChange(formatDate(nextChange, locale))}</p>
          ) : (
            <div>
              <Link to="/citizenship/change" className={buttonClassName({ variant: 'secondary' })}>
                {copy.change}
              </Link>
            </div>
          )}
        </>
      )}
      {citizen.reviews_citizenship ? (
        <div>
          <Link to="/citizenship/requests" className={buttonClassName({ variant: 'ghost' })}>
            {copy.reviewRequests}
          </Link>
        </div>
      ) : null}
      <ActionFeedback problem={cancel.problem} copy={copy} />
    </Panel>
  );
}
