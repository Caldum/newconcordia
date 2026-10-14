import { Field } from '@concordia/atlas/Field';

import { useMessages } from '../../i18n';

import { CountryField } from './CountryField';
import { messages } from './messages';

interface TransferFieldsProps {
  /** The receiving country. */
  country: string;
  amount: string;
  invalid: boolean;
  onCountry: (code: string) => void;
  onAmount: (text: string) => void;
}

/** Where the Gold goes (another country in play) and how much. */
export function TransferFields({
  country,
  amount,
  invalid,
  onCountry,
  onAmount,
}: TransferFieldsProps) {
  const copy = useMessages(messages);

  return (
    <>
      <CountryField label={copy.country} value={country} onChange={onCountry} />
      <Field
        label={copy.amount}
        hint={copy.amountHint}
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        error={invalid ? copy.transferInvalid : undefined}
        onChange={(event) => {
          onAmount(event.target.value);
        }}
      />
    </>
  );
}
