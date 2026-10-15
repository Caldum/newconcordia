// The battlefield scene of the independence war: two tanks a side, which one fires each new strike, where its
// shell flies and when.

/** Tanks drawn on each side. */
export const TANKS = 2;

/** At most this many shots per refresh, so a burst of strikes stays readable. */
export const MAX_VOLLEY = 8;

/** Milliseconds between the shots of one volley. */
export const SHOT_GAP_MS = 320;

/** Width and height of the scene. */
export const SCENE = { width: 640, height: 320 } as const;

/** One frame of the tank sprite strip (12 frames: idle, the flash growing, the smoke clearing). */
export const TANK_FRAME = { width: 288, height: 135, count: 12 } as const;

/** The barrel's tip in a frame, as a share of its width and height, facing right. */
const BARREL_TIP = [372 / 384, 63.5 / 180] as const;

/** How long the firing frames last. */
export const FIRE_MS = 1200;

/** Milliseconds from the start of the firing frames to the flash at its brightest, when the shell leaves. */
export const FIRE_TO_SHELL_MS = 300;

export interface TankSpot {
  /** Top-left corner of the sprite, facing right (the occupier's are mirrored on the scene's center). */
  x: number;
  y: number;
  width: number;
  height: number;
}

function spot(x: number, y: number, width: number): TankSpot {
  return { x, y, width, height: (width * TANK_FRAME.height) / TANK_FRAME.width };
}

/** The country's tanks on the snowy street: one further back and smaller, one in front. */
export const OUR_TANKS: readonly TankSpot[] = [spot(8, 150, 140), spot(92, 162, 170)];

function ourTank(index: number): TankSpot {
  const tank = OUR_TANKS[index % TANKS] ?? OUR_TANKS[0];
  if (!tank) throw new Error('no tanks');
  return tank;
}

/** The occupier's tank in the same place on the other side, mirrored. */
export function theirTank(index: number): TankSpot {
  const ours = ourTank(index);
  return { ...ours, x: SCENE.width - ours.x - ours.width };
}

/** Where a tank's shell leaves the barrel, in the scene. */
export function muzzleOf(side: 'ours' | 'theirs', index: number): [number, number] {
  const tank = side === 'ours' ? ourTank(index) : theirTank(index);
  const tipX = tank.width * BARREL_TIP[0];
  const y = tank.y + tank.height * BARREL_TIP[1];
  return [side === 'ours' ? tank.x + tipX : tank.x + tank.width - tipX, y];
}

/** Where a shell lands on a tank: the middle of its hull. */
export function hitOf(side: 'ours' | 'theirs', index: number): [number, number] {
  const tank = side === 'ours' ? ourTank(index) : theirTank(index);
  return [tank.x + tank.width * 0.45, tank.y + tank.height * 0.6];
}

export interface Shot {
  id: number;
  /** The country's tank that fires, 0 to TANKS − 1: always the same for the same citizen. */
  shooter: number;
  /** The occupier's tank hit, 0 to TANKS − 1. */
  target: number;
  damage: number;
  /** Delay of this shot within the volley, in milliseconds. */
  delay: number;
  mine: boolean;
}

/** A stable tank for a name: the same citizen always fires from the same one. */
export function tankOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return hash % TANKS;
}

/** The shots for the strikes that just arrived, oldest first, one after another. */
export function volley(
  strikes: readonly { attack_id: number; name: string; damage: number }[],
  fresh: ReadonlySet<number>,
  myName: string,
): Shot[] {
  return strikes
    .filter((strike) => fresh.has(strike.attack_id))
    .slice(0, MAX_VOLLEY)
    .reverse()
    .map((strike, index) => ({
      id: strike.attack_id,
      shooter: tankOf(strike.name),
      target: (strike.attack_id * 7) % TANKS,
      damage: strike.damage,
      delay: index * SHOT_GAP_MS,
      mine: strike.name === myName,
    }));
}

/** For each of the country's tanks, its first shot in the volley: its firing frames play then. */
export function firstShots(shots: readonly Shot[]): Map<number, Shot> {
  const first = new Map<number, Shot>();
  for (const shot of shots) if (!first.has(shot.shooter)) first.set(shot.shooter, shot);
  return first;
}

/** A place in the scene as CSS percentages of the scene's box, so every layer scales with its width. */
export function sceneBox(
  x: number,
  y: number,
  width?: number,
  height?: number,
): { left: string; top: string; width?: string; height?: string } {
  const pctX = (value: number) => `${String(Math.round((value / SCENE.width) * 10_000) / 100)}%`;
  const pctY = (value: number) => `${String(Math.round((value / SCENE.height) * 10_000) / 100)}%`;
  return {
    left: pctX(x),
    top: pctY(y),
    ...(width === undefined ? {} : { width: pctX(width) }),
    ...(height === undefined ? {} : { height: pctY(height) }),
  };
}
