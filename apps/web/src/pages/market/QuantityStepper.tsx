import { Icon } from '@concordia/atlas/Icon';

import market from './MarketPage.module.css';

interface QuantityStepperProps {
  value: number;
  max: number;
  /** Names the number field. */
  label: string;
  lessLabel: string;
  moreLabel: string;
  onChange: (value: number) => void;
}

/** − 0 +: units of one offer for the ticket; the number can also be typed. */
export function QuantityStepper({
  value,
  max,
  label,
  lessLabel,
  moreLabel,
  onChange,
}: QuantityStepperProps) {
  return (
    <span className={market.stepper}>
      <button
        type="button"
        aria-label={lessLabel}
        disabled={value <= 0}
        onClick={() => {
          onChange(value - 1);
        }}
      >
        <Icon name="minus" size={16} />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        value={String(value)}
        onChange={(event) => {
          const typed = Number(event.target.value.replace(/\D/g, ''));
          onChange(Number.isFinite(typed) ? Math.min(typed, max) : 0);
        }}
      />
      <button
        type="button"
        aria-label={moreLabel}
        disabled={value >= max}
        onClick={() => {
          onChange(value + 1);
        }}
      >
        <Icon name="plus" size={16} />
      </button>
    </span>
  );
}
