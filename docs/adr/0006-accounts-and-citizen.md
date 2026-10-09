# 0006 · Accounts: Supabase Auth, Turnstile and the citizen created with the sign-up

Date: 2026-10-09 · Status: Accepted

## Context

D05 asks for sign-up and sign-in with Supabase Auth, Turnstile on sign-up and the verification email through
Resend. The brief adds that sign-up asks for email, password, citizen name (unique and immutable) and
country, and offers Google. D06 (citizenship) builds on the country chosen here. Several details were open.

## Decisions

1. **Turnstile through Supabase Auth's own CAPTCHA protection**, not through a Worker of ours. Auth verifies
   the token with Cloudflare before creating a user or a session, so nothing reaches the database without it.
   Auth asks for the token on sign-up, password sign-in, password recovery and resend, so the widget is on
   all those forms (visible on sign-up, *interaction-only* elsewhere). Auth does not check the token's
   hostname or action; the widget's hostname list in Cloudflare covers the first.
2. **The citizen is created in the same transaction as the account.** The form sends the name, the country
   and the language as user metadata; a trigger on `auth.users` validates them and inserts
   `game.citizens`. A taken or invalid name makes the sign-up fail, so there are no accounts without a citizen
   from the email flow. The metadata is input only and is never read for authorization. Google accounts have
   no citizen at first and create it once with `public.create_my_citizen`.
3. **Names are unique ignoring case and accents** (ICU collation at strength 1), between 3 and 24 characters,
   letters or digits joined by one space, hyphen or apostrophe. They cannot change after the email is
   confirmed.
4. **Unconfirmed names are reservations.** Without this, a mistyped email would lock the name forever. A
   reservation is released after 24 hours without confirmation, or right away when the same browser signs up
   again: the form sends a random 256-bit `signup_key` and keeps it in the tab. This is what makes
   «Corrígela sin perder lo que completaste» true. Signing up again with the same unconfirmed email replaces
   the reservation.
5. **Email links carry a token hash** and land on `/auth/confirm`, which calls `verifyOtp`. A link opened on
   the phone works even though the sign-up happened on the computer (the PKCE code flow would not). Google
   uses PKCE. The link base is the site origin and the templates add `/auth/confirm`, so a missing redirect
   falls back to the project's site URL and still works.
6. **Emails in the player's language** with one template per kind that branches on the language saved in the
   metadata. Subjects are bilingual because Auth does not template them.
7. **Session persistence** follows «Mantener la sesión en este equipo»: local storage when checked (the
   default), session storage when not. A new password signs out every other session.
8. **Country at sign-up**: only the 13 countries in play for now. «Otro país» and the waitlist arrive with
   D06, which also turns the choice into citizenship (number, adaptation period).
9. **Terms and privacy checkbox**: the canvas shows one, but there are no legal texts yet and accepting
   texts that do not exist would be meaningless. It is left out until the owner provides them
   (`docs/setup.md`, step 8).
10. **Leaked password check**: the canvas lists «No aparece en filtraciones conocidas». That check belongs to
    Auth (a paid-plan option) and is listed as an owner step; the form states only the rules it enforces.

## Consequences

- `supabase/config.toml` holds local settings (test CAPTCHA secret, high email limit) and is not pushed to
  the hosted projects; their Auth settings are owner steps in `docs/setup.md`.
- supabase-js now loads on the first screen to know whether a session exists. The initial JavaScript is at
  163.7 of 170 kB; a lighter client (Auth and PostgREST without Realtime or Storage) is a follow-up if the
  budget gets tight.
