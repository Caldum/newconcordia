import { Panel } from '@concordia/atlas/Panel';

import { useSignedInUser } from '../../features/auth/useSignedInUser';
import { removeAvatar, uploadAvatar } from '../../features/profile/api';
import { PictureField } from '../../features/profile/PictureField';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import styles from './EditProfile.module.css';
import { messages } from './messages';

/** The profile picture: choosing a new one or going back to the initials. */
export function AvatarPanel({ path }: { path: string | null }) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const { userId } = useSignedInUser();
  return (
    <Panel className={styles.panel} aria-labelledby="edit-picture">
      <h2 id="edit-picture" className="at-title-2">
        {copy.pictureTitle}
      </h2>
      <PictureField
        name={citizen.name}
        path={path}
        store={(file) => uploadAvatar(userId, file)}
        clear={removeAvatar}
      />
    </Panel>
  );
}
