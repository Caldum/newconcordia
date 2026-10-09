import type { SVGProps } from 'react';

import { iconPaths } from '../icons.generated';
import { renderSvgNodes } from '../SvgNodes';

export type IconName = keyof typeof iconPaths;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
  /** 14, 16, 18, 20 or 24 px (Atlas iconography). */
  size?: 14 | 16 | 18 | 20 | 24;
  /** Accessible name. Without it the icon is decorative and hidden from assistive technology. */
  label?: string;
}

/** Atlas stroke icon, drawn with currentColor. Always next to a word, or with a label. */
export function Icon({ name, size = 20, label, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...rest}
    >
      {renderSvgNodes(iconPaths[name], name)}
    </svg>
  );
}
