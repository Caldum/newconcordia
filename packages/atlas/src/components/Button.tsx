import type { ButtonHTMLAttributes } from 'react';

import { cx } from '../cx';

import styles from './Button.module.css';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export type ButtonVariant = 'primary' | 'war' | 'secondary' | 'ghost' | 'light' | 'outline-light';
export type ButtonSize = 'regular' | 'large';

interface ButtonStyle {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
}

/**
 * Class names of an Atlas button, for links that must look like one (for example a router link).
 * One `primary` per view and at most one `war` per screen.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'regular',
}: ButtonStyle = {}): string {
  return cx(styles.button, styles[variant], size === 'large' && styles.large);
}

interface ButtonProps extends ButtonStyle, ButtonHTMLAttributes<HTMLButtonElement> {
  /** 18 px icon before the text. */
  icon?: IconName;
}

/** The text starts with a verb and says what happens: «Entrar a combatir». */
export function Button({
  variant,
  size,
  icon,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(buttonClassName({ variant, size }), className)} {...rest}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  );
}
