import { Note } from '@concordia/atlas/Note';

import { problemText } from './gameErrors';

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
  return (
    <>
      {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
      {success === undefined ? null : (
        <div role="status">{success ? <Note tone="ok">{success}</Note> : null}</div>
      )}
    </>
  );
}
