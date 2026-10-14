import { describe, expect, it } from 'vitest';

import { centeredSquare, isAcceptedPicture, picturePath } from './pictures';

describe('centeredSquare', () => {
  it('cuts the middle of a wide picture', () => {
    expect(centeredSquare(1200, 800)).toEqual({ x: 200, y: 0, side: 800 });
  });

  it('cuts the middle of a tall picture', () => {
    expect(centeredSquare(600, 901)).toEqual({ x: 0, y: 150, side: 600 });
  });

  it('keeps a square whole', () => {
    expect(centeredSquare(256, 256)).toEqual({ x: 0, y: 0, side: 256 });
  });
});

describe('isAcceptedPicture', () => {
  it('takes PNG, JPEG and WebP up to 10 MB', () => {
    expect(isAcceptedPicture({ type: 'image/jpeg', size: 2_000_000 })).toBe(true);
    expect(isAcceptedPicture({ type: 'image/webp', size: 10 * 1024 * 1024 })).toBe(true);
  });

  it('refuses other files, empty ones and larger ones', () => {
    expect(isAcceptedPicture({ type: 'image/gif', size: 1000 })).toBe(false);
    expect(isAcceptedPicture({ type: 'image/png', size: 0 })).toBe(false);
    expect(isAcceptedPicture({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toBe(false);
  });
});

describe('picturePath', () => {
  it('stores WebP under the folder', () => {
    expect(picturePath('citizens/u1', 'abc')).toBe('citizens/u1/abc.webp');
  });
});
