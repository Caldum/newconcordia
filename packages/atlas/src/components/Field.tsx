import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

import { cx } from '../cx';

import styles from './Field.module.css';
import { Icon } from './Icon';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-invalid'> {
  /** Always visible above the input. */
  label: string;
  /** Guidance shown under the input while there is no error. */
  hint?: ReactNode;
  /** What happened and how to fix it: «Falta el dominio, por ejemplo camila@gmail.com». */
  error?: ReactNode;
  /** Positive confirmation: «Nombre disponible». */
  success?: ReactNode;
  id?: string;
  /** The input element, for example to move focus to the first field with an error. */
  ref?: Ref<HTMLInputElement> | undefined;
}

/** 52 px text field with its label above and its messages tied to it for screen readers. */
export function Field({ label, hint, error, success, id, className, ...inputProps }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? success ?? hint;

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />
      {message ? (
        <span
          id={messageId}
          className={cx(
            styles.hint,
            Boolean(error) && styles.error,
            !error && Boolean(success) && styles.ok,
          )}
        >
          {error ? <Icon name="alert" size={16} /> : null}
          {!error && success ? <Icon name="check" size={16} /> : null}
          {message}
        </span>
      ) : null}
    </div>
  );
}
