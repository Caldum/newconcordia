import { describe, expect, it } from 'vitest';

import {
  hitOf,
  MAX_VOLLEY,
  muzzleOf,
  OUR_TANKS,
  firstShots,
  SCENE,
  sceneBox,
  SHOT_GAP_MS,
  TANKS,
  tankOf,
  theirTank,
  volley,
} from './battlefield';

describe('the battlefield', () => {
  it('gives each citizen the same tank every time', () => {
    expect(tankOf('Bot Belgrano')).toBe(tankOf('Bot Belgrano'));
    for (const name of ['Ana', 'Bot Güemes', 'Camila Ríos', 'Bot Azurduy']) {
      expect(tankOf(name)).toBeGreaterThanOrEqual(0);
      expect(tankOf(name)).toBeLessThan(TANKS);
    }
  });

  it('mirrors the occupier on the other side, barrels facing each other', () => {
    const ours = OUR_TANKS[0];
    expect(OUR_TANKS).toHaveLength(TANKS);
    const theirs = theirTank(0);
    expect(theirs.x + theirs.width).toBe(SCENE.width - (ours?.x ?? 0));
    const [ourMuzzleX] = muzzleOf('ours', 0);
    const [theirMuzzleX] = muzzleOf('theirs', 0);
    expect(ourMuzzleX).toBeLessThan(SCENE.width / 2);
    expect(theirMuzzleX).toBeGreaterThan(SCENE.width / 2);
    expect(ourMuzzleX + theirMuzzleX).toBe(SCENE.width);
    const [hitX] = hitOf('theirs', 0);
    expect(hitX).toBeGreaterThan(theirs.x);
    expect(hitX).toBeLessThan(theirs.x + theirs.width);
  });

  it('fires only the new strikes, oldest first, one after another', () => {
    const strikes = [
      { attack_id: 12, name: 'Camila Ríos', damage: 20 },
      { attack_id: 11, name: 'Bot Belgrano', damage: 14 },
      { attack_id: 10, name: 'Bot Güemes', damage: 15 },
    ];
    const shots = volley(strikes, new Set([12, 11]), 'Camila Ríos');
    expect(shots.map((shot) => shot.id)).toEqual([11, 12]);
    expect(shots.map((shot) => shot.delay)).toEqual([0, SHOT_GAP_MS]);
    expect(shots[1]).toMatchObject({ damage: 20, mine: true, shooter: tankOf('Camila Ríos') });
    expect(shots[0]?.mine).toBe(false);
  });

  it('keeps a big burst readable and fires each tank at its first shot', () => {
    const strikes = Array.from({ length: 20 }, (_, index) => ({
      attack_id: 100 - index,
      name: 'Bot Brown',
      damage: 10,
    }));
    const shots = volley(strikes, new Set(strikes.map((strike) => strike.attack_id)), 'Ana');
    expect(shots).toHaveLength(MAX_VOLLEY);
    expect(shots[0]?.id).toBe(93);
    const first = firstShots(shots);
    expect(first.size).toBe(1);
    expect(first.get(tankOf('Bot Brown'))?.delay).toBe(0);
  });

  it('places layers as shares of the scene', () => {
    expect(sceneBox(64, 160, 320, 32)).toEqual({
      left: '10%',
      top: '50%',
      width: '50%',
      height: '10%',
    });
    expect(sceneBox(0, 0)).toEqual({ left: '0%', top: '0%' });
  });
});
