import { Note } from '@concordia/atlas/Note';

import { useMessages } from '../../i18n';

import { problemText } from './gameErrors';
import { sharedErrors } from './sharedErrors';

interface ActionFeedbackProps {
  /** Stable code of the last refusal, or null. */
  problem: string | null;
  /** The screen's catalog: `error_<code>` for each refusal it explains, `error_other` for the rest. */
  copy: { error_other: string };
  /** Success note. When given (even null), a status region announces it. */
  success?: string | null;
}

/** The outcome of an action: the refusal explained, and the success announced. */
export function ActionFeedback({ problem, copy, success }: ActionFeedbackProps) {
  const shared = useMessages(sharedErrors);
  // Refusals any action can get (the rate limit) fall back to the shared catalog.
  const text = problem ? problemText({ ...shared, ...copy }, problem) : null;
  return (
    <>
      {text ? <Note tone="error">{text}</Note> : null}
      {success === undefined ? null : (
        <div role="status">{success ? <Note tone="ok">{success}</Note> : null}</div>
      )}
    </>
  );
}
