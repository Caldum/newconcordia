import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { ministryGoods } from '../../features/finance/ministry';
import type { MinistryCode } from '../../features/politics/billTerms';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { MinistryBuyForm } from './MinistryBuyForm';
import { MinistryPayForm } from './MinistryPayForm';
import { MinistryStock } from './MinistryStock';

/** What the minister can do with their ministry's funds and goods. */
export function MinistryPanel({ ministry }: { ministry: MinistryCode }) {
  const copy = useMessages(messages);
  const goods = ministryGoods(ministry);

  return (
    <>
      <Panel className={styles.panel} aria-labelledby="ministry-title">
        <h2 id="ministry-title" className="at-title-3">
          {copy.ministryTitle(copy[`institution_${ministry}`])}
        </h2>
        <p className={styles.muted}>{copy.ministryHint}</p>
        <MinistryPayForm />
        {goods.length > 0 ? <MinistryBuyForm goods={goods} /> : null}
      </Panel>
      <MinistryStock ministry={ministry} />
    </>
  );
}
