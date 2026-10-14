import { Button } from '@concordia/atlas/Button';

import { useMessages } from '../../i18n';
import { ActionFeedback } from '../actions/ActionFeedback';
import { useGameAction } from '../actions/useGameAction';
import { useGoodName } from '../economy/goods';
import { useProfile } from '../profile/useProfile';

import { applyKit } from './api';
import { messages } from './messages';

/** Using one medical kit: off at full health, then what it healed. */
export function UseKitButton({ goodCode }: { goodCode: string }) {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  const profile = useProfile();
  const full = profile.data ? profile.data.health >= profile.data.health_max : false;
  const use = useGameAction((key) => applyKit(goodCode, key));
  const outcome = use.result?.[0];

  return (
    <>
      <ActionFeedback
        problem={use.problem}
        copy={copy}
        success={outcome ? copy.healed(outcome.healed, outcome.health) : null}
      />
      <div>
        <Button
          variant="secondary"
          disabled={use.pending || full}
          aria-label={copy.useKitLabel(goodName(goodCode))}
          onClick={() => {
            use.run();
          }}
        >
          {copy.useKit}
        </Button>
      </div>
      {full ? <p>{copy.healthFull}</p> : null}
    </>
  );
}
