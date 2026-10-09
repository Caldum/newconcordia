import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

interface RadioItem<Value extends string> {
  value: Value;
  disabled?: boolean | undefined;
}

interface RovingRadio<Value extends string> {
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** Props for each radio button of the group. */
  radioProps: (item: RadioItem<Value>) => {
    role: 'radio';
    'aria-checked': boolean;
    tabIndex: 0 | -1;
    disabled: boolean;
    'data-value': Value;
    onClick: () => void;
  };
}

const nextKeys = new Set(['ArrowDown', 'ArrowRight']);
const previousKeys = new Set(['ArrowUp', 'ArrowLeft']);

/**
 * WAI-ARIA radio group behavior: Tab enters at the checked option, arrows move and check, Home and
 * End jump to the ends, Space and Enter (native button activation) check the focused option.
 */
export function useRovingRadio<Value extends string>(
  items: readonly RadioItem<Value>[],
  value: Value | null,
  onChange: (value: Value) => void,
): RovingRadio<Value> {
  const enabled = items.filter((item) => !item.disabled);
  const tabStop = enabled.some((item) => item.value === value) ? value : enabled[0]?.value;

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const radios = [
        ...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)'),
      ];
      const current = radios.findIndex((radio) => radio === document.activeElement);
      let target: HTMLElement | undefined;
      if (nextKeys.has(event.key)) target = radios[(current + 1) % radios.length];
      else if (previousKeys.has(event.key)) target = radios.at(current <= 0 ? -1 : current - 1);
      else if (event.key === 'Home') target = radios[0];
      else if (event.key === 'End') target = radios.at(-1);
      if (!target) return;

      event.preventDefault();
      target.focus();
      const next = target.dataset.value;
      if (next !== undefined) onChange(next as Value);
    },
    [onChange],
  );

  return {
    onKeyDown,
    radioProps: (item) => ({
      role: 'radio',
      'aria-checked': item.value === value,
      tabIndex: item.value === tabStop ? 0 : -1,
      disabled: Boolean(item.disabled),
      'data-value': item.value,
      onClick: () => {
        onChange(item.value);
      },
    }),
  };
}
