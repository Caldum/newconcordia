import { useId } from 'react';

export interface SilhouetteShape {
  /** SVG path data in the silhouette's viewBox. */
  d: string;
  /** Marks this shape (the player's region in the citizenship document). */
  highlighted?: boolean;
}

/** Battle fill: a hard gradient from the bottom, defender up to its share and attacker the rest. */
export interface SilhouetteSplit {
  bottomColor: string;
  topColor: string;
  /** Between 0 and 1. */
  bottomShare: number;
}

interface SilhouetteProps {
  shapes: readonly SilhouetteShape[];
  viewBox: string;
  /** Place name, written as text nearby too: the silhouette alone does not identify a place. */
  label: string;
  /** Country color (`var(--country-xxx)`) or the occupier's color. */
  fill?: string;
  highlightFill?: string;
  split?: SilhouetteSplit;
  /** Country not in play: dotted outline only. */
  inactive?: boolean;
  /** White borders between shapes (regions of a country). */
  borders?: boolean;
  width?: number | string;
}

/** Real map geometry of a country or region, the main graphic element of Atlas. */
export function Silhouette({
  shapes,
  viewBox,
  label,
  fill = 'var(--ink)',
  highlightFill = 'var(--nation-deep)',
  split,
  inactive = false,
  borders = false,
  width = '100%',
}: SilhouetteProps) {
  const gradientId = `silhouette-${useId().replaceAll(':', '')}`;
  const share = split
    ? `${Math.round(Math.min(1, Math.max(0, split.bottomShare)) * 1000) / 10}%`
    : '';
  const shapeFill = split ? `url(#${gradientId})` : fill;

  return (
    <svg viewBox={viewBox} width={width} role="img" aria-label={label} style={{ height: 'auto' }}>
      {split ? (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="1" y2="0">
            <stop offset={share} stopColor={split.bottomColor} />
            <stop offset={share} stopColor={split.topColor} />
          </linearGradient>
        </defs>
      ) : null}
      {shapes.map((shape) => (
        <path
          key={shape.d}
          d={shape.d}
          {...(inactive
            ? {
                fill: 'none',
                stroke: 'var(--line-control)',
                strokeWidth: 1.5,
                strokeDasharray: '4 4',
              }
            : {
                fill: shape.highlighted ? highlightFill : shapeFill,
                ...(borders ? { stroke: '#FFFFFF', strokeWidth: 1.2 } : {}),
              })}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
