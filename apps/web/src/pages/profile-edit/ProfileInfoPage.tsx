import { useProfileDetails } from '../../features/profile/queries';

import { AvatarPanel } from './AvatarPanel';
import { BioPanel } from './BioPanel';
import { EditProfileFrame } from './EditProfileFrame';

/** `/profile/edit`: the picture and the description. */
export function ProfileInfoPage() {
  const details = useProfileDetails();
  return (
    <EditProfileFrame>
      <AvatarPanel path={details.data?.avatar_path ?? null} />
      {details.isSuccess ? <BioPanel saved={details.data?.bio ?? ''} /> : null}
    </EditProfileFrame>
  );
}
