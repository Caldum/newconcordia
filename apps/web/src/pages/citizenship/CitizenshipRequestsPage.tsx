import { Navigate } from '@tanstack/react-router';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { decideCitizenshipRequest } from '../../features/citizenship/api';
import { useRequestsToReview } from '../../features/citizenship/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './CitizenshipPage.module.css';
import { CitizenshipRequestCard } from './CitizenshipRequestCard';
import { requestsMessages as messages } from './messages';

interface Decision {
  requestId: number;
  name: string;
  approve: boolean;
}

/** `/citizenship/requests`: for the president and the Interior minister, the requests to join. */
export function CitizenshipRequestsPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const requests = useRequestsToReview();
  const decide = useGameAction((_, decision: Decision) =>
    decideCitizenshipRequest(decision.requestId, decision.approve),
  );
  const decided = decide.succeeded ? decide.variables : undefined;

  if (!citizen.reviews_citizenship) return <Navigate to="/citizenship" replace />;

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro(countryName(citizen.country_code))}</p>
      </div>
      <ActionFeedback
        problem={decide.problem}
        copy={copy}
        success={
          decided
            ? decided.approve
              ? copy.approved(decided.name)
              : copy.rejected(decided.name)
            : null
        }
      />
      {requests.data?.length === 0 ? <p>{copy.none}</p> : null}
      <ul className={styles.requests}>
        {requests.data?.map((request) => (
          <li key={request.request_id}>
            <CitizenshipRequestCard
              request={request}
              onDecide={(approve) => {
                decide.run({ requestId: request.request_id, name: request.citizen_name, approve });
              }}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
