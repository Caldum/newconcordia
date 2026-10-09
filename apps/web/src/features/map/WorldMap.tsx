import { Icon } from '@concordia/atlas/Icon';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { ZoomBehavior } from 'd3-zoom';
import { useEffect, useRef } from 'react';

import { MAP_HEIGHT, MAP_WIDTH } from './geometry';
import type { Shape } from './geometry';
import styles from './WorldMap.module.css';

const MAX_ZOOM = 40;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface WorldMapProps {
  shapes: readonly Shape[];
  borders: { countryBorders: string; regionBorders: string };
  /** Fill of a playable shape (its owner's color); undefined draws it as not in play. */
  fillOf: (shapeId: string) => string | undefined;
  selectedId: string | null;
  onSelect: (shapeId: string) => void;
  /** Shape to bring into view (after a search or a choice in the panel). */
  focusId: string | null;
  label: string;
  labels: { zoomIn: string; zoomOut: string; zoomReset: string };
}

/**
 * The world as SVG. Regions are not tab stops: keyboard users choose them with the search box, and the
 * zoom buttons replace gestures.
 */
export function WorldMap({
  shapes,
  borders,
  fillOf,
  selectedId,
  onSelect,
  focusId,
  label,
  labels,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // d3-zoom owns the transform; it is applied straight to the layer, without React renders per frame.
  useEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer) return;
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [MAP_WIDTH, MAP_HEIGHT],
      ])
      .on('zoom', (event: { transform: { toString(): string } }) => {
        layer.setAttribute('transform', event.transform.toString());
      });
    select(svg).call(behavior).on('dblclick.zoom', null);
    zoomRef.current = behavior;
    return () => {
      select(svg).on('.zoom', null);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    const shape = shapes.find((candidate) => candidate.id === focusId);
    if (!svg || !behavior || !shape) return;
    const [[x0, y0], [x1, y1]] = shape.bounds;
    const scale = Math.min(MAX_ZOOM, 0.6 / Math.max((x1 - x0) / MAP_WIDTH, (y1 - y0) / MAP_HEIGHT));
    const target = zoomIdentity
      .translate(MAP_WIDTH / 2, MAP_HEIGHT / 2)
      .scale(Math.max(1, scale))
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    select(svg)
      .transition()
      .duration(reducedMotion() ? 0 : 450)
      .call((transition) => {
        behavior.transform(transition, target);
      });
  }, [focusId, shapes]);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (svg && behavior) {
      select(svg)
        .transition()
        .duration(reducedMotion() ? 0 : 250)
        .call((transition) => {
          behavior.scaleBy(transition, factor);
        });
    }
  };
  const reset = () => {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (svg && behavior) {
      select(svg)
        .transition()
        .duration(reducedMotion() ? 0 : 350)
        .call((transition) => {
          behavior.transform(transition, zoomIdentity);
        });
    }
  };

  return (
    <div className={styles.frame}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label={label}
      >
        <g ref={layerRef}>
          {shapes.map((shape) => {
            const fill = fillOf(shape.id);
            const playable = fill !== undefined;
            return (
              <path
                key={shape.id}
                d={shape.d}
                data-shape={shape.id}
                className={[
                  styles.shape,
                  playable ? styles.playable : styles.inactive,
                  shape.id === selectedId ? styles.selected : '',
                ].join(' ')}
                {...(playable
                  ? {
                      fill,
                      stroke: fill,
                      onClick: () => {
                        onSelect(shape.id);
                      },
                    }
                  : {})}
              />
            );
          })}
          <path className={styles.regionBorders} d={borders.regionBorders} />
          <path className={styles.countryBorders} d={borders.countryBorders} />
        </g>
      </svg>
      <div className={styles.controls}>
        <button
          type="button"
          aria-label={labels.zoomIn}
          onClick={() => {
            zoomBy(1.6);
          }}
        >
          <Icon name="plus" size={20} />
        </button>
        <button
          type="button"
          aria-label={labels.zoomOut}
          onClick={() => {
            zoomBy(1 / 1.6);
          }}
        >
          <Icon name="minus" size={20} />
        </button>
        <button type="button" aria-label={labels.zoomReset} onClick={reset}>
          <Icon name="globe" size={20} />
        </button>
      </div>
    </div>
  );
}
