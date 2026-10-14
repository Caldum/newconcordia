import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';

import { useMessages } from '../../i18n';
import { ActionFeedback } from '../actions/ActionFeedback';
import { useGameAction } from '../actions/useGameAction';

import styles from './AcceptLegalPanel.module.css';
import { acceptLegal } from './api';
import type { LegalVersions } from './api';
import { legalMessages } from './messages';
import type { LegalStatus } from './queries';

/** Accepting the terms and the privacy policy in force, with links to read them. */
export function AcceptLegalPanel({ status }: { status: readonly LegalStatus[] }) {
  const copy = useMessages(legalMessages);
  const checkId = useId();
  const [agreed, setAgreed] = useState(false);
  const [checked, setChecked] = useState(false);
  const accept = useGameAction((_, versions: LegalVersions) => acceptLegal(versions));
  const terms = status.find((d) => d.document === 'terms');
  const privacy = status.find((d) => d.document === 'privacy');
  const seenBefore = status.some((d) => d.version > 1);
  if (!terms || !privacy) return null;
  return (
    <main className={styles.main}>
      <Panel className={styles.panel} aria-labelledby="legal-gate-title">
        <h1 id="legal-gate-title" className="at-title-2">
          {copy.gateTitle}
        </h1>
        <p>{seenBefore ? copy.gateChanged : copy.gateIntro}</p>
        <ul className={styles.links}>
          <li>
            <Link to="/terms" target="_blank">
              {copy.terms(terms.version)}
            </Link>
          </li>
          <li>
            <Link to="/privacy" target="_blank">
              {copy.privacy(privacy.version)}
            </Link>
          </li>
        </ul>
        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setChecked(true);
            if (agreed) accept.run({ terms: terms.version, privacy: privacy.version });
          }}
        >
          <div className={styles.check}>
            <input
              id={checkId}
              type="checkbox"
              checked={agreed}
              aria-invalid={checked && !agreed}
              onChange={(event) => {
                setAgreed(event.target.checked);
              }}
            />
            <label htmlFor={checkId}>{copy.agree}</label>
          </div>
          {checked && !agreed ? <p className={styles.error}>{copy.mustAgree}</p> : null}
          <ActionFeedback problem={accept.problem} copy={copy} />
          <div>
            <Button type="submit" disabled={accept.pending}>
              {copy.accept}
            </Button>
          </div>
        </form>
      </Panel>
    </main>
  );
}
