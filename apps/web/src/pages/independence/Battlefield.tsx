import { useRef, useState } from 'react';

import {
  FIRE_TO_SHELL_MS,
  firstShots,
  hitOf,
  muzzleOf,
  sceneBox,
  TANKS,
  volley,
} from '../../features/war/battlefield';
import { newStrikeIds } from '../../features/war/live';
import type { Strike } from '../../features/war/queries';
import { useIndependenceFeed } from '../../features/war/queries';
import { formatNumber, useLocale } from '../../i18n';
import { useBeat } from '../../lib/useBeat';
import { useOnScreen } from '../../lib/useOnScreen';

import styles from './Battlefield.module.css';
import { ShellShot } from './ShellShot';
import { backgroundImage, snowImage } from './sprites';
import { Tank } from './Tank';

const TANK_INDEXES = Array.from({ length: TANKS }, (_, index) => index);

/** The occupier answers on its own every so often. */
const ENEMY_FIRE_MS = 3400;

interface BattlefieldProps {
  warId: number;
  myName: string;
  country: string;
  /** While active both sides fire; once won the occupier's tanks smoke and the flag goes up. */
  status: string;
}

/**
 * The war as a scene: each strike that lands, from any citizen, is a shell from one of the country's tanks at the
 * occupier's, with the damage it did. Decorative: the latest strikes list says the same in words.
 * Plain HTML layers that only animate transform and opacity, so the compositor runs them off the main thread;
 * the background is painted once. Images: see src/assets/war/README.md.
 */
export function Battlefield({ warId, myName, country, status }: BattlefieldProps) {
  const { locale } = useLocale();
  const strikes = useIndependenceFeed(warId).data;
  // New strikes since the previous refresh (state adjusted while rendering); each becomes a shot once.
  const [shown, setShown] = useState<{ list: readonly Strike[] | undefined; fresh: Set<number> }>({
    list: undefined,
    fresh: new Set(),
  });
  if (strikes && strikes !== shown.list) {
    setShown({ list: strikes, fresh: newStrikeIds(shown.list, strikes) });
  }
  const shots = volley(strikes ?? [], shown.fresh, myName);
  const firing = firstShots(shots);
  const active = status === 'active';
  const won = status === 'won';
  const scene = useRef<HTMLDivElement>(null);
  // Each beat one of the occupier's tanks fires at one of the country's, only while someone can see it.
  const onScreen = useOnScreen(scene);
  const beat = useBeat(ENEMY_FIRE_MS, active && onScreen);
  const enemy = beat > 0 ? { shooter: beat % TANKS, target: (beat + 1) % TANKS } : null;

  return (
    <div
      ref={scene}
      className={styles.scene}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        ['--own' as string]: `var(--country-${country.toLowerCase()}, var(--nation))`,
      }}
    >
      {TANK_INDEXES.map((index) => {
        const shot = firing.get(index);
        return (
          <Tank
            key={`ours-${String(index)}`}
            side="ours"
            index={index}
            fire={shot ? { id: shot.id, delay: shot.delay } : null}
            wrecked={false}
          />
        );
      })}
      {TANK_INDEXES.map((index) => (
        <Tank
          key={`theirs-${String(index)}`}
          side="theirs"
          index={index}
          fire={enemy?.shooter === index ? { id: `beat-${String(beat)}`, delay: 0 } : null}
          wrecked={won}
        />
      ))}

      {won ? (
        <span className={styles.flag} style={sceneBox(70, 82, 42, 70)}>
          <span className={styles.cloth} />
        </span>
      ) : null}

      {active && enemy ? (
        <ShellShot
          key={`enemy-${String(beat)}`}
          from={muzzleOf('theirs', enemy.shooter)}
          to={hitOf('ours', enemy.target)}
          delay={FIRE_TO_SHELL_MS}
          reverse
        />
      ) : null}

      {shots.map((shot) => (
        <ShellShot
          key={shot.id}
          from={muzzleOf('ours', shot.shooter)}
          to={hitOf('theirs', shot.target)}
          delay={shot.delay + FIRE_TO_SHELL_MS}
          label={`−${formatNumber(shot.damage, locale)}`}
          mine={shot.mine}
        />
      ))}
      {/* Snow over everything, falling on its own layer. */}
      <span className={styles.snow} style={{ backgroundImage: `url(${snowImage})` }} />
    </div>
  );
}
