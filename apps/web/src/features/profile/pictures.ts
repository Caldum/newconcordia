/** Side of every stored picture, in pixels: enough for the profile at twice its size. */
export const pictureSide = 256;

/** What a player may choose: PNG, JPEG or WebP up to 10 MB, shrunk before uploading. */
const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
const maxChosenBytes = 10 * 1024 * 1024;

export const pictureAccept = acceptedTypes.join(',');

export function isAcceptedPicture(file: { type: string; size: number }): boolean {
  return acceptedTypes.includes(file.type) && file.size > 0 && file.size <= maxChosenBytes;
}

/** The centered square of a picture: where to cut it so it fills a round or square frame. */
export function centeredSquare(
  width: number,
  height: number,
): { x: number; y: number; side: number } {
  const side = Math.min(width, height);
  return { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), side };
}

/** «citizens/<user>/<uuid>.webp»: a new name each time, so a changed picture is never served stale. */
export function picturePath(folder: string, id: string): string {
  return `${folder}/${id}.webp`;
}

/**
 * Cuts the centered square and shrinks it to 256 × 256 WebP in the browser. Throws `picture_invalid` when the
 * file is not a picture the browser can read.
 */
export async function shrinkPicture(file: File): Promise<Blob> {
  if (!isAcceptedPicture(file)) throw new Error('picture_invalid');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('picture_invalid');
  });
  const square = centeredSquare(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = pictureSide;
  canvas.height = pictureSide;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('picture_invalid');
  context.drawImage(
    bitmap,
    square.x,
    square.y,
    square.side,
    square.side,
    0,
    0,
    pictureSide,
    pictureSide,
  );
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('picture_invalid'));
      },
      'image/webp',
      0.85,
    );
  });
}
