import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { qualityOf } from '../../features/economy/goods';
import { useProfile } from '../../features/profile/useProfile';
import { attack, setBattleOrder } from '../../features/war/api';
import type { Side } from '../../features/war/api';
import { attackDamage } from '../../features/war/damage';
import type { Battle } from '../../features/war/queries';
import { useMyWeapon } from '../../features/war/queries';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface FightPanelProps {
  battle: Battle;
  isDefenseMinister: boolean;
}

/** Attacking for either side (the database decides who may), with a preview of the damage. */
export function FightPanel({ battle, isDefenseMinister }: FightPanelProps) {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const profile = useProfile().data ?? null;
  const weapon = useMyWeapon().data ?? null;
  const fight = useGameAction((key, side: Side) => attack(battle.battle_id, side, key), {
    refreshes: [['war']],
  });
  const order = useGameAction(() => setBattleOrder(battle.battle_id), { refreshes: [['war']] });
  const result = fight.result ?? null;
  const preview = profile
    ? attackDamage({
        strength: profile.strength,
        health: profile.health,
        rankStep: profile.rank_step,
        weaponQuality: weapon ? (qualityOf(weapon.good_code) ?? 0) : 0,
      })
    : null;
  const button = (side: Side, country: string) => (
    <Button
      disabled={fight.pending}
      onClick={() => {
        fight.run(side);
      }}
    >
      {copy.attackFor(countryName(country))}
    </Button>
  );

  return (
    <Panel className={styles.panel} aria-labelledby="fight-title">
      <h2 id="fight-title" className="at-title-3">
        {copy.fightTitle}
      </h2>
      <p className={styles.muted}>{copy.fightHint}</p>
      {preview === null ? null : <p>{copy.preview(preview)}</p>}
      <ActionFeedback
        problem={fight.problem}
        copy={copy}
        success={
          result
            ? result.health_lost > 0
              ? copy.attackedInjured(result.damage, result.military_xp, result.health_lost)
              : copy.attacked(result.damage, result.military_xp)
            : null
        }
      />
      <div className={styles.actions}>
        {button('attacker', battle.attacker_country_code)}
        {button('defender', battle.defender_country_code)}
      </div>
      {isDefenseMinister && !battle.my_side_order ? (
        <>
          <ActionFeedback
            problem={order.problem}
            copy={copy}
            success={order.succeeded ? copy.orderSet : null}
          />
          <div>
            <Button
              variant="secondary"
              disabled={order.pending || order.succeeded}
              onClick={() => {
                order.run();
              }}
            >
              {copy.setOrder}
            </Button>
          </div>
        </>
      ) : null}
    </Panel>
  );
}
