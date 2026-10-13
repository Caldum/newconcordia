import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Steps } from '@concordia/atlas/Steps';
import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import styles from '../../features/auth/AuthForm.module.css';
import { CitizenNameField } from '../../features/auth/CitizenNameField';
import { CountryField } from '../../features/auth/CountryField';
import { GoogleSignIn } from '../../features/auth/GoogleButton';
import { authMessages } from '../../features/auth/messages';
import { PasswordField } from '../../features/auth/PasswordField';
import { minimumPasswordLength } from '../../features/auth/passwordRules';
import { Turnstile } from '../../features/auth/Turnstile';
import type { TurnstileHandle } from '../../features/auth/Turnstile';
import { WaitlistChoice } from '../../features/citizenship/WaitlistChoice';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { useSignUpForm } from './useSignUpForm';

/** Email, password, citizen name and country (or a waitlist), then the email to confirm. */
export function SignUpForm() {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const turnstile = useRef<TurnstileHandle>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const form = useSignUpForm({ turnstile, emailInput, passwordInput, nameInput });
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);

  const emailError =
    form.showErrors && !form.emailValid
      ? form.email.trim() === ''
        ? copy.emailMissing
        : shared.problem('emailInvalid')
      : undefined;
  const passwordError =
    form.showErrors && form.passwordMissing > 0
      ? copy.passwordShort(form.passwordMissing)
      : undefined;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit();
      }}
    >
      <Steps label={copy.steps} steps={[copy.stepData, copy.stepEmail]} current={0} />
      <div className={styles.heading}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p>
          {copy.haveAccount} <Link to="/sign-in">{copy.signIn}</Link>
        </p>
      </div>
      <GoogleSignIn label={copy.google} />
      <Field
        ref={emailInput}
        label={shared.email}
        type="email"
        autoComplete="email"
        required
        value={form.email}
        onChange={(event) => {
          form.setEmail(event.target.value);
        }}
        error={emailError}
      />
      <PasswordField
        ref={passwordInput}
        label={shared.password}
        autoComplete="new-password"
        required
        minLength={minimumPasswordLength}
        value={form.password}
        onChange={(event) => {
          form.setPassword(event.target.value);
        }}
        hint={copy.passwordHint}
        error={passwordError}
        success={form.password !== '' && form.passwordMissing <= 0 ? copy.passwordOk : undefined}
      />
      <CitizenNameField
        ref={nameInput}
        value={form.citizenName}
        onChange={form.setCitizenName}
        signupKey={form.signupKey}
        onStatus={form.onNameStatus}
        showErrors={form.showErrors}
        forcedStatus={form.forcedNameStatus}
      />
      <CountryField
        value={form.countryCode}
        onChange={form.setCountryCode}
        showErrors={form.showErrors}
        allowOther
      />
      {form.waits ? (
        <WaitlistChoice
          waitlistCountry={form.waitlistCountry}
          onWaitlistCountry={form.setWaitlistCountry}
          startCountry={form.startCountry}
          onStartCountry={form.setStartCountry}
          showErrors={form.showErrors}
        />
      ) : null}
      <Turnstile
        ref={turnstile}
        action="signup"
        onToken={form.setCaptchaToken}
        onUnavailable={() => {
          setCaptchaUnavailable(true);
        }}
      />
      {captchaUnavailable ? <Note tone="error">{shared.turnstileUnavailable}</Note> : null}
      {form.problem ? <Note tone="error">{shared.problem(form.problem)}</Note> : null}
      <Button type="submit" size="large" className={styles.submit} disabled={form.sending}>
        {form.sending ? copy.sending : copy.submit}
      </Button>
    </form>
  );
}
