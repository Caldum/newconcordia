import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { newStrikeIds } from '../../features/war/live';
import type { Strike } from '../../features/war/queries';
import { useIndependenceFeed } from '../../features/war/queries';
import { useMessages } from '../../i18n';
import { useTick } from '../../lib/useTick';

import styles from './IndependenceWar.module.css';
import { messages } from './messages';
import { StrikeRow } from './StrikeRow';

interface StrikeFeedProps {
  warId: number;
  /** The player's citizen name, to show their own strikes as «Tú». */
  myName: string;
}

/** Everyone's latest strikes, refreshed every two seconds; new ones slide in. */
export function StrikeFeed({ warId, myName }: StrikeFeedProps) {
  const copy = useMessages(messages);
  const now = useTick();
  const strikes = useIndependenceFeed(warId).data;
  // The list of the previous refresh, to tell which strikes are new (state adjusted while rendering).
  const [shown, setShown] = useState<{ list: readonly Strike[] | undefined; fresh: Set<number> }>({
    list: undefined,
    fresh: new Set(),
  });
  if (strikes && strikes !== shown.list) {
    setShown({ list: strikes, fresh: newStrikeIds(shown.list, strikes) });
  }
  const fresh = shown.fresh;

  return (
    <Panel aria-labelledby="feed-title" className={styles.fighter}>
      <h2 id="feed-title" className="at-title-3">
        {copy.feedTitle}
      </h2>
      {strikes?.length === 0 ? <p>{copy.feedEmpty}</p> : null}
      <ol className={styles.list}>
        {(strikes ?? []).map((strike) => (
          <StrikeRow
            key={strike.attack_id}
            strike={strike}
            fresh={fresh.has(strike.attack_id)}
            mine={strike.name === myName}
            now={now}
          />
        ))}
      </ol>
    </Panel>
  );
}
