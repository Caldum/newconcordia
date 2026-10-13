import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { setCompanyOffer } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import type { Company } from '../../features/economy/queries';
import { amountInput, parseAmount } from '../../features/ledger/amount';
import { useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** Whole numbers up to 999, or null. */
function parseCount(text: string): number | null {
  return /^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null;
}

/** The job offer: one wage for everyone and the vacancies to fill. */
export function CompanyJobOffer({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const [wageText, setWageText] = useState(
    company.wage > 0 ? amountInput(company.wage, locale) : '',
  );
  const [vacanciesText, setVacanciesText] = useState(String(company.vacancies));
  const [checked, setChecked] = useState(false);
  const wage = parseAmount(wageText);
  const vacancies = parseCount(vacanciesText);
  const publish = useGameAction((_, offer: { wage: number; vacancies: number }) =>
    setCompanyOffer(company.id, offer.wage, offer.vacancies),
  );

  return (
    <form
      className={styles.form}
      noValidate
      aria-label={copy.offerTitle}
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (wage !== null && vacancies !== null) publish.run({ wage, vacancies });
      }}
    >
      <h3 className="at-title-3">{copy.offerTitle}</h3>
      <Field
        label={copy.wage}
        value={wageText}
        inputMode="decimal"
        autoComplete="off"
        error={checked && wage === null ? copy.amountInvalid : undefined}
        onChange={(event) => {
          setWageText(event.target.value);
        }}
      />
      <Field
        label={copy.vacancies}
        value={vacanciesText}
        inputMode="numeric"
        autoComplete="off"
        error={checked && vacancies === null ? copy.error_amount_invalid : undefined}
        onChange={(event) => {
          setVacanciesText(event.target.value);
        }}
      />
      <ActionFeedback
        problem={publish.problem}
        copy={copy}
        success={publish.succeeded ? copy.published : null}
      />
      <div>
        <Button type="submit" disabled={publish.pending}>
          {copy.publish}
        </Button>
      </div>
    </form>
  );
}
