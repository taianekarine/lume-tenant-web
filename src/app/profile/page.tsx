import { AuthenticatedShell } from '@/features/navigation';
import { ProfilePage } from '@/features/profile';
import type { TenantProfile } from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function ProfileRoute() {
  const session = await requireTenantSession(['profile:view', 'profile:update']);
  let profile: TenantProfile;

  try {
    profile = await executeAuthenticatedTenantRequest((gateway) => gateway.getProfile());
  } catch (error) {
    rethrowTenantPageError(error);
  }

  return (
    <AuthenticatedShell user={session.user}>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <ProfilePage profile={profile} />
      </main>
    </AuthenticatedShell>
  );
}
