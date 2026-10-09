import { logoPaths } from '../logos.generated';
import type { SvgNode } from '../SvgNodes';
import { renderSvgNodes } from '../SvgNodes';

import styles from './Brand.module.css';

/** The disputed region of the mark is war red; inside the game it can take the player's color. */
const disputedRegionFill = '#C8372D';

export type BrandMarkVersion = keyof typeof logoPaths;

interface BrandMarkProps {
  /** `mark` for light backgrounds and nation, `markOnInk` for ink, `appIcon` below 20 px. */
  version?: BrandMarkVersion;
  /** Minimum 20 px. */
  size?: number;
  /** Fill for the disputed region (for example `var(--nation)`); defaults to war red. */
  disputedColor?: string;
  /** Accessible name; leave empty when the logotype is next to it. */
  label?: string;
}

function recolorDisputed(nodes: readonly SvgNode[], color: string): SvgNode[] {
  return nodes.map(([tag, attrs, children]) => {
    const recolored = attrs.fill === disputedRegionFill ? { ...attrs, fill: color } : attrs;
    return children ? [tag, recolored, recolorDisputed(children, color)] : [tag, recolored];
  });
}

export function BrandMark({ version = 'mark', size = 38, disputedColor, label }: BrandMarkProps) {
  const nodes = disputedColor
    ? recolorDisputed(logoPaths[version], disputedColor)
    : logoPaths[version];
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {renderSvgNodes(nodes, `brand-${version}`)}
    </svg>
  );
}

interface BrandProps {
  /** Mark size in px; the logotype scales with it. */
  size?: number;
  onInk?: boolean;
  disputedColor?: string;
}

/** Mark plus the «Concordia» logotype. The visible word is the accessible name. */
export function Brand({ size = 38, onInk = false, disputedColor }: BrandProps) {
  return (
    <span
      className={onInk ? `${styles.brand} ${styles.onInk}` : styles.brand}
      style={{ gap: size / 3 }}
    >
      <BrandMark
        version={onInk ? 'markOnInk' : 'mark'}
        size={size}
        {...(disputedColor ? { disputedColor } : {})}
      />
      <span className={styles.logotype} style={{ fontSize: size * 0.58 }}>
        Concordia
      </span>
    </span>
  );
}
