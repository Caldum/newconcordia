import { EditProfileFrame } from './EditProfileFrame';
import { EmailPanel } from './EmailPanel';
import { PasswordPanel } from './PasswordPanel';

/** `/profile/edit/security`: the email and the password of the account. */
export function ProfileSecurityPage() {
  return (
    <EditProfileFrame>
      <EmailPanel />
      <PasswordPanel />
    </EditProfileFrame>
  );
}
