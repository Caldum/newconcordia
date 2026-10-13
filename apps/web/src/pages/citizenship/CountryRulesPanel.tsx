import { Panel } from '@concordia/atlas/Panel';

import { useCitizenshipRules } from '../../features/citizenship/queries';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import styles from './CitizenshipPage.module.css';
import { changeMessages as messages } from './messages';

/** What the chosen country asks: automatic or reviewed, how long to answer, the wait to vote. */
export function CountryRulesPanel({ countryCode }: { countryCode: string }) {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const rules = useCitizenshipRules(countryCode).data;
  if (!rules) return null;
  return (
    <Panel className={styles.panel} aria-labelledby="rules-title">
      <h2 id="rules-title" className="at-title-3">
        {copy.rulesTitle(countryName(countryCode))}
      </h2>
      <dl className={styles.facts}>
        <dt>{copy.mode}</dt>
        <dd>{rules.mode === 'automatic' ? copy.automatic : copy.review}</dd>
        {rules.mode === 'review' ? (
          <>
            <dt>{copy.answer}</dt>
            <dd>{copy.answerValue(rules.answer_hours)}</dd>
          </>
        ) : null}
        <dt>{copy.electionWait}</dt>
        <dd>{copy.days(rules.election_wait_days)}</dd>
      </dl>
    </Panel>
  );
}
