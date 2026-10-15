import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { EnergyMeter } from '@concordia/atlas/Track';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { problemText } from '../../features/actions/gameErrors';
import { useGameAction } from '../../features/actions/useGameAction';
import { qualityOf, useGoodName } from '../../features/economy/goods';
import { useProfile } from '../../features/profile/useProfile';
import { independenceStrikes } from '../../features/war/api';
import type { StrikeBurst } from '../../features/war/api';
import { attackDamage } from '../../features/war/damage';
import { useMyWeapon } from '../../features/war/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import styles from './IndependenceWar.module.css';
import { messages } from './messages';

const BURST = 5;

interface StrikePanelProps {
  warId: number;
  country: string;
}

/** Striking for the country: energy, health and weapon, one strike or five in a row. */
export function StrikePanel({ warId, country }: StrikePanelProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const goodName = useGoodName();
  const profile = useProfile().data ?? null;
  const weapon = useMyWeapon().data ?? null;
  const strike = useGameAction<number, StrikeBurst | null>(
    (key, count) => independenceStrikes(warId, count, key),
    { refreshes: [['war']] },
  );
  const energy = profile?.energy ?? 0;
  const health = profile?.health ?? 0;
  const perStrike = profile
    ? attackDamage({
        strength: profile.strength,
        health: profile.health,
        rankStep: profile.rank_step,
        weaponQuality: weapon ? (qualityOf(weapon.good_code) ?? 0) : 0,
      })
    : null;
  const result = strike.result ?? null;
  const outcome = result
    ? (result.strikes === 1
        ? copy.struck(result.damage)
        : copy.burstDone(result.strikes, result.damage)) +
      (result.healthLost > 0 ? copy.injured(result.healthLost) : '')
    : null;

  return (
    <Panel className={styles.fighter} aria-labelledby="strike-title">
      <h2 id="strike-title" className="at-title-3">
        {copy.strikeTitle(countryName(country))}
      </h2>
      <EnergyMeter
        value={energy}
        max={100}
        label={copy.energy}
        valueText={copy.energyText(energy)}
      />
      <p className={styles.boardLine}>
        <span>{copy.health(health)}</span>
        {perStrike === null ? null : <span>{copy.perStrike(formatNumber(perStrike, locale))}</span>}
      </p>
      <p>{weapon ? copy.weapon(goodName(weapon.good_code), weapon.uses_left) : copy.unarmed}</p>
      <ActionFeedback problem={strike.problem} copy={copy} success={outcome} />
      {result?.stoppedBy ? (
        <Note tone="info">{copy.stopped + problemText(copy, result.stoppedBy)}</Note>
      ) : null}
      <div className={styles.actions}>
        <Button
          variant="war"
          disabled={strike.pending || energy < 10 || health <= 0}
          onClick={() => {
            strike.run(1);
          }}
        >
          {copy.strike}
        </Button>
        <Button
          variant="secondary"
          disabled={strike.pending || energy < 10 || health <= 0}
          onClick={() => {
            strike.run(BURST);
          }}
        >
          {copy.burst}
        </Button>
      </div>
      {health <= 0 ? (
        <Note tone="warning">{copy.noHealth}</Note>
      ) : energy < 30 ? (
        <Note tone="info">{copy.lowEnergy}</Note>
      ) : null}
    </Panel>
  );
}
