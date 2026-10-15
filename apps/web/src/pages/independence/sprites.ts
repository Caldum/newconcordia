// The battlefield's images (see src/assets/war/README.md): the snowy street, the snow and the tank firing (a strip
// of 12 frames), provided by the owner, and Kenney's «Tanks» pack (CC0) for the shell, the blast and the smoke.
import background from '../../assets/war/battlefield-snow.webp';
import shell from '../../assets/war/bulletFly2.png';
import ring from '../../assets/war/explosion1.png';
import wreckSmoke from '../../assets/war/explosion12.png';
import blast from '../../assets/war/explosion4.png';
import smoke from '../../assets/war/explosion9.png';
import snow from '../../assets/war/snow.webp';
import tankFire from '../../assets/war/tank-fire.webp';

export const tankStrip = tankFire;

export const backgroundImage = background;

/** Falling snow: a tile that repeats downwards. */
export const snowImage = snow;

export const effectSprites = { shell, ring, blast, smoke, wreckSmoke } as const;
