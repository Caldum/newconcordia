import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { upgradeCompany, upgradeCompanyQuality } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import { qualityOf } from '../../features/economy/goods';
import type { Company } from '../../features/economy/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The next level and, for food, weapons and kits, the next quality, with their price in Gold. */
export function CompanyUpgrades({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const level = useGameAction((key) => upgradeCompany(company.id, key));
  const quality = useGameAction((key) => upgradeCompanyQuality(company.id, key));
  const currentQuality = qualityOf(company.good_code);

  return (
    <div className={styles.form}>
      <div className={styles.actions}>
        {company.next_level_gold !== null ? (
          <Button
            variant="secondary"
            disabled={level.pending}
            onClick={() => {
              level.run();
            }}
          >
            {copy.upgrade(company.level + 1, company.next_level_gold)}
          </Button>
        ) : null}
        {currentQuality !== null && company.next_quality_gold !== null ? (
          <Button
            variant="secondary"
            disabled={quality.pending}
            onClick={() => {
              quality.run();
            }}
          >
            {copy.quality(currentQuality + 1, company.next_quality_gold)}
          </Button>
        ) : null}
      </div>
      <ActionFeedback
        problem={level.problem ?? quality.problem}
        copy={copy}
        success={level.succeeded || quality.succeeded ? copy.done : null}
      />
    </div>
  );
}
