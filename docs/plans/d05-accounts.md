# D05 · Accounts

**Acceptance test (GDD):** a person signs up, verifies their email, signs in and signs out; a sign-up without
Turnstile is rejected.

## Design

- **Auth:** Supabase Auth with email and password (confirmation required, minimum 10 characters) and Google
  (enabled per environment, see `docs/setup.md`). The browser client uses the PKCE flow for Google; email
  links carry a `token_hash` that `/auth/confirm` verifies, so a link sent to the phone works on any device.
- **Turnstile:** Supabase Auth's own CAPTCHA protection (`[auth.captcha]`, provider `turnstile`). Auth
  verifies the token with Cloudflare before it creates the user or a session, so a request without a valid
  token never reaches the database. The widget appears on sign-up, sign-in and password recovery (Auth
  demands the token on all three). Keys: Cloudflare's test keys locally and in CI; real keys per
  environment as secrets.
- **Citizen:** the sign-up form sends the citizen name, the chosen country and the interface language as
  user metadata. A trigger on `auth.users` creates `game.citizens` (name unique ignoring case and accents,
  immutable) in the same transaction, so a sign-up with a taken or invalid name fails and nothing is left
  half created. `public.is_citizen_name_available(name)` lets the form say «Disponible» before submitting.
  Metadata is only input: it is validated in the trigger and never used for authorization afterwards.
- **Google sign-ups** arrive without a citizen; the app sends them to `/citizen` to choose name and country,
  which calls `public.create_my_citizen(name, country)` (only for the signed-in user, once).
- **Country:** sign-up offers the 13 countries in play (Atlas `CountryPicker`). D06 turns the choice into
  citizenship (number, adaptation period) and adds «Otro país» with the waitlist.
- **Emails:** confirmation, recovery and email change templates in `supabase/templates/`, in Spanish or
  English according to the language saved at sign-up. Production sends through Resend SMTP
  (`docs/setup.md`).
- **Session:** «Mantener la sesión en este equipo» chooses `localStorage` or `sessionStorage` for the
  Supabase session. Changing the password signs out every other session.
- **Screens (canvas):** Landing, SignUp, SignIn, RecoverPassword, RecoverPasswordSent, NewPassword,
  EmailVerification; a minimal signed-in home with sign out until D08 brings the real one.
- **Errors:** Auth error codes (`invalid_credentials`, `email_not_confirmed`, `weak_password`,
  `captcha_failed`, `over_email_send_rate_limit`, `same_password`…) and database codes
  (`citizen_name_taken`, `citizen_name_invalid`) map to each screen's catalog.

## Tests

- pgTAP: citizens table locked down, name rules, uniqueness ignoring case and accents, immutability,
  trigger creates the citizen from metadata, `create_my_citizen` only for the caller and only once.
- Unit: forms (validation, error mapping, password visibility, steps), session storage choice, route
  guards.
- E2E (local Supabase with Mailpit): the full journey reading the confirmation email from Mailpit; a direct
  sign-up request without a CAPTCHA token is rejected by Auth.
