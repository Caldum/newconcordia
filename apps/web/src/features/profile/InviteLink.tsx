import { Button } from '@concordia/atlas/Button';
import { useState } from 'react';

import { defineMessages, useMessages } from '../../i18n';
import { useCurrentCitizen } from '../shell/CurrentCitizen';

import styles from './InviteLink.module.css';
import { referralLink } from './referral';

const messages = defineMessages({
  es: { copy: 'Copiar enlace', copied: 'Enlace copiado', label: 'Tu enlace de invitación' },
  en: { copy: 'Copy link', copied: 'Link copied', label: 'Your invitation link' },
});

/** The player's invitation link, to copy and share. */
export function InviteLink() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const [copied, setCopied] = useState(false);
  const link = referralLink(window.location.origin, citizen.name);
  return (
    <div className={styles.invite}>
      <p className={styles.label}>{copy.label}</p>
      <p className={styles.link}>{link}</p>
      <div>
        <Button
          variant="secondary"
          icon="send"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? copy.copied : copy.copy}
        </Button>
      </div>
    </div>
  );
}
