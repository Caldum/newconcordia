import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** How a workday turns into goods, with the recipe of each line. */
export function HowProductionWorks() {
  const copy = useMessages(messages);
  return (
    <Panel className={styles.panel} aria-labelledby="how-title">
      <h2 id="how-title" className="at-title-3">
        {copy.howTitle}
      </h2>
      <p>{copy.howBody}</p>
      <ul className={styles.recipes}>
        <li>
          <span>{copy.foodQ}</span>
          <span>{copy.recipeFood}</span>
        </li>
        <li>
          <span>{copy.weaponsQ}</span>
          <span>{copy.recipeWeapon}</span>
        </li>
        <li>
          <span>{copy.kitsQ}</span>
          <span>{copy.recipeKit}</span>
        </li>
      </ul>
    </Panel>
  );
}
