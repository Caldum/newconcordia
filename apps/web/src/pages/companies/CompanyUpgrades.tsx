import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { upgradeCompany } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import type { Company } from '../../features/economy/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The next level (more paid shifts; more efficiency or quality), its GOLD price and civil level. */
export function CompanyUpgrades({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const upgrade = useGameAction((key) => upgradeCompany(company.id, key));
  if (company.next_level_gold === null) return null;
  return (
    <div className={styles.form}>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={upgrade.pending}
          onClick={() => {
            upgrade.run();
          }}
        >
          {copy.upgrade(
            company.level + 1,
            formatMoney(company.next_level_gold, locale, { whole: true }),
          )}
        </Button>
      </div>
      {company.next_level_civil_level !== null ? (
        <p className={styles.muted}>{copy.upgradeNeeds(company.next_level_civil_level)}</p>
      ) : null}
      <ActionFeedback
        problem={upgrade.problem}
        copy={copy}
        success={upgrade.succeeded ? copy.done : null}
      />
    </div>
  );
}
