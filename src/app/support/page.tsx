import { AuthenticatedShell } from '@/features/navigation';
import { SupportPage } from '@/features/support';
import type { TenantProfile } from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function SupportRoute() {
  const session = await requireTenantSession(['support:view', 'support:create']);
  let profile: TenantProfile;

  try {
    profile = await executeAuthenticatedTenantRequest((gateway) => gateway.getProfile());
  } catch (error) {
    rethrowTenantPageError(error);
  }

  return (
    <AuthenticatedShell user={session.user}>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <SupportPage
          requester={{
            name: profile.name,
            username: profile.username,
            email: profile.email,
          }}
        />
      </div>
    </AuthenticatedShell>
  );
}
