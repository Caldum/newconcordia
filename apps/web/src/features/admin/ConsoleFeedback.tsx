import { useMessages } from '../../i18n';
import { ActionFeedback } from '../actions/ActionFeedback';

import { consoleErrors } from './messages';

interface ConsoleFeedbackProps {
  problem: string | null;
  /** The page's own `error_<code>` copy; the console's shared refusals fill the rest. */
  copy?: Record<string, unknown>;
  success?: string | null;
}

/** The outcome of a console action, with the refusals every console action can get. */
export function ConsoleFeedback({ problem, copy = {}, success }: ConsoleFeedbackProps) {
  const shared = useMessages(consoleErrors);
  return (
    <ActionFeedback
      problem={problem}
      copy={{ ...shared, ...copy }}
      {...(success === undefined ? {} : { success })}
    />
  );
}
