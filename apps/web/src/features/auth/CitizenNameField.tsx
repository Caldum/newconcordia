import { Field } from '@concordia/atlas/Field';
import { useEffect, useState } from 'react';
import type { Ref } from 'react';

import { defineMessages, useMessages } from '../../i18n';

import { checkCitizenName, isValidCitizenName } from './citizenName';
import type { NameStatus } from './citizenName';

const messages = defineMessages({
  es: {
    label: 'Nombre de tu ciudadano',
    hint: 'Es tu nombre público en el juego. Entre 3 y 24 caracteres.',
    checking: 'Revisando si está libre…',
    available: 'Disponible. No podrás cambiarlo después.',
    taken: 'Ese nombre ya es de otro ciudadano. Prueba con otro.',
    invalid: 'Usa entre 3 y 24 letras o números, con un espacio, guion o apóstrofo entre palabras.',
    required: 'Escribe el nombre de tu ciudadano.',
  },
  en: {
    label: 'Your citizen’s name',
    hint: 'Your public name in the game. Between 3 and 24 characters.',
    checking: 'Checking whether it is free…',
    available: 'Available. You cannot change it later.',
    taken: 'Another citizen already has that name. Try another one.',
    invalid: 'Use 3 to 24 letters or numbers, with one space, hyphen or apostrophe between words.',
    required: 'Write your citizen’s name.',
  },
});

/** How long typing has to pause before the name is checked. */
const checkDelayMs = 400;

interface CitizenNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Sent with the check so this browser's own earlier reservation counts as free. */
  signupKey?: string;
  /** Reported to the form, which blocks sending on anything but `available`. */
  onStatus: (status: NameStatus | 'unknown') => void;
  /** The form tried to send: show what is missing. */
  showErrors: boolean;
  /** The server said the name was taken after all. */
  forcedStatus?: NameStatus | null;
  ref?: Ref<HTMLInputElement>;
}

export function CitizenNameField({
  value,
  onChange,
  signupKey,
  onStatus,
  showErrors,
  forcedStatus,
  ref,
}: CitizenNameFieldProps) {
  const copy = useMessages(messages);
  const name = value.trim();
  const [checked, setChecked] = useState<{ name: string; status: NameStatus } | null>(null);

  useEffect(() => {
    if (!isValidCitizenName(name)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkCitizenName(name, signupKey)
        .then((status) => {
          if (!cancelled) setChecked({ name, status });
        })
        .catch(() => {
          // Without an answer the form still sends; the database decides.
          if (!cancelled) setChecked(null);
        });
    }, checkDelayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, signupKey]);

  let status: NameStatus | 'checking' | 'empty' | 'unknown';
  if (name === '') status = 'empty';
  else if (!isValidCitizenName(name)) status = 'invalid';
  else if (forcedStatus && forcedStatus !== 'available') status = forcedStatus;
  else if (checked?.name === name) status = checked.status;
  else status = 'checking';

  const reported = status === 'checking' || status === 'empty' ? 'unknown' : status;
  useEffect(() => {
    onStatus(reported);
  }, [onStatus, reported]);

  let error: string | undefined;
  if (status === 'taken') error = copy.taken;
  else if (status === 'invalid' && (showErrors || name.length >= 3)) error = copy.invalid;
  else if (status === 'empty' && showErrors) error = copy.required;

  return (
    <Field
      ref={ref}
      label={copy.label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      autoComplete="nickname"
      required
      maxLength={24}
      hint={status === 'checking' ? copy.checking : copy.hint}
      error={error}
      success={status === 'available' ? copy.available : undefined}
    />
  );
}
