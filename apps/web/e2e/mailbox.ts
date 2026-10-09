import { expect } from '@playwright/test';

// Mailpit, the local Supabase test mailbox: Auth emails land here instead of being sent.
const mailbox = process.env.E2E_MAILBOX_URL ?? 'http://127.0.0.1:54324';

interface MessageSummary {
  ID: string;
  Subject: string;
}

const subjects = {
  confirmation: 'Confirma tu correo',
  recovery: 'Recupera tu contraseña',
} as const;

/** Waits for the newest email of a kind sent to `address` and returns the link it carries. */
export async function linkFromLatestEmail(
  address: string,
  kind: keyof typeof subjects = 'confirmation',
): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetch(
          `${mailbox}/api/v1/search?query=${encodeURIComponent(`to:"${address}" subject:"${subjects[kind]}"`)}`,
        );
        const body = (await response.json()) as { messages: MessageSummary[] };
        id = body.messages[0]?.ID;
        return id;
      },
      { message: `a ${kind} email for ${address}`, timeout: 15_000 },
    )
    .toBeTruthy();

  const message = (await (await fetch(`${mailbox}/api/v1/message/${String(id)}`)).json()) as {
    HTML: string;
  };
  const href = /href="([^"]*token_hash=[^"]*)"/.exec(message.HTML)?.[1];
  if (!href) throw new Error(`No link in the email for ${address}`);
  return href.replaceAll('&amp;', '&');
}
