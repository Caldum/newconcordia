import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { categoryOf, qualityOf, useGoodName } from '../../features/economy/goods';
import { useMyInventory } from '../../features/market/queries';
import { equipWeapon } from '../../features/war/api';
import { useMyWeapon } from '../../features/war/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The equipped weapon and its uses; when unarmed, a weapon from the inventory can be equipped by hand. */
export function WeaponPanel() {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  const weapon = useMyWeapon().data ?? null;
  const inventory = useMyInventory().data ?? [];
  const weapons = inventory.filter(
    (line) =>
      categoryOf(line.good_code) === 'military' &&
      qualityOf(line.good_code) !== null &&
      line.quantity > 0,
  );
  const equip = useGameAction((_, good: string) => equipWeapon(good), { refreshes: [['war']] });

  return (
    <Panel className={styles.panel} aria-labelledby="weapon-title">
      <h2 id="weapon-title" className="at-title-3">
        {copy.weaponTitle}
      </h2>
      <p>{weapon ? copy.weaponLine(goodName(weapon.good_code), weapon.uses_left) : copy.unarmed}</p>
      <ActionFeedback
        problem={equip.problem}
        copy={copy}
        success={equip.succeeded ? copy.equipped : null}
      />
      {weapon ? null : weapons.length === 0 ? (
        <p className={styles.muted}>{copy.noWeapons}</p>
      ) : (
        <div className={styles.actions}>
          {weapons.map((line) => (
            <Button
              key={line.good_code}
              variant="secondary"
              disabled={equip.pending}
              onClick={() => {
                equip.run(line.good_code);
              }}
            >
              {copy.equip(goodName(line.good_code))}
            </Button>
          ))}
        </div>
      )}
    </Panel>
  );
}
