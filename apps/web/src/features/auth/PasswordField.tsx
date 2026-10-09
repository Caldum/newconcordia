import { Field } from '@concordia/atlas/Field';
import { Icon } from '@concordia/atlas/Icon';
import { useState } from 'react';
import type { ComponentProps } from 'react';

import { useMessages } from '../../i18n';

import { authMessages } from './messages';
import styles from './PasswordField.module.css';

type PasswordFieldProps = Omit<ComponentProps<typeof Field>, 'type'>;

/** Password field with a «Mostrar» toggle, so long passwords can be checked before sending. */
export function PasswordField(props: PasswordFieldProps) {
  const copy = useMessages(authMessages);
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.wrap}>
      <Field {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={visible}
        aria-label={copy.showPasswordLabel}
        onClick={() => {
          setVisible((current) => !current);
        }}
      >
        <Icon name="eye" size={18} />
        <span aria-hidden="true">{visible ? copy.hidePassword : copy.showPassword}</span>
      </button>
    </div>
  );
}
