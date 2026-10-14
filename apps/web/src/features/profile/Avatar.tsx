import { pictureUrl } from './api';
import styles from './Avatar.module.css';
import { initials } from './initials';

interface AvatarProps {
  /** Whose picture: a citizen, a party or a regiment. Its initials stand in without a picture. */
  name: string;
  path: string | null | undefined;
  /** Side in pixels. */
  size: number;
}

/** A square picture with rounded corners. Decorative: the name is always written beside it. */
export function Avatar({ name, path, size }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {path ? (
        <img src={pictureUrl(path)} alt="" width={size} height={size} loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
