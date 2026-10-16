import { Note } from '@concordia/atlas/Note';

import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { sanctionMessages } from './messages';
import { useMySanctions } from './queries';

/** Tells the player about a warning, a mute or a suspension, with the moderators' note and until when. */
export function SanctionNotice() {
  const copy = useMessages(sanctionMessages);
  const { locale } = useLocale();
  const sanctions = useMySanctions().data ?? [];
  if (sanctions.length === 0) return null;
  return (
    <div>
      {sanctions.map((sanction) => (
        <Note
          key={sanction.starts_at + sanction.kind}
          tone={sanction.kind === 'warning' ? 'warning' : 'error'}
        >
          {sanction.kind === 'warning'
            ? copy.warning
            : copy[sanction.kind](
                sanction.ends_at ? formatDateTime(sanction.ends_at, locale) : null,
              )}{' '}
          {copy.reason(copy[`reason_${sanction.reason}`])}
          {sanction.note ? ` «${sanction.note}»` : null}
        </Note>
      ))}
    </div>
  );
}
