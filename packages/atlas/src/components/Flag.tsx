import { useId } from 'react';

import { flagPaths } from '../flags.generated';
import { renderSvgNodes } from '../SvgNodes';

import styles from './Flag.module.css';

export type FlagCode = keyof typeof flagPaths;

export function hasFlag(code: string): code is FlagCode {
  return Object.hasOwn(flagPaths, code);
}

interface FlagProps {
  /** ISO 3166-1 alpha-3 code. */
  code: FlagCode;
  /** Width in px; the height follows the 4:3 ratio. 52 in grids, 48 in lists. */
  width?: number;
}

/** Simplified 4:3 flag. Decorative: the country name is always written next to it. */
export function Flag({ code, width = 52 }: FlagProps) {
  const idPrefix = `flag-${code}-${useId().replaceAll(':', '')}`;
  return (
    <span className={styles.flag} style={{ width, height: (width * 3) / 4 }}>
      <svg
        viewBox="0 0 640 480"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        {renderSvgNodes(flagPaths[code], idPrefix)}
      </svg>
    </span>
  );
}
