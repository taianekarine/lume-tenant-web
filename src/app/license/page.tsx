import { redirect } from 'next/navigation';

import { canAccessLicense } from '@/features/auth/domain';
import { LicensePage } from '@/features/tenant-administration/components';
import type { LocalLicenseStatus } from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function LicenseRoute() {
  const session = await requireTenantSession(['license:view']);
  if (!canAccessLicense(session.user)) redirect('/dashboard');

  let license: LocalLicenseStatus;

  try {
    license = await executeAuthenticatedTenantRequest((gateway) => gateway.getLicenseStatus());
  } catch (error) {
    rethrowTenantPageError(error);
  }

  return <LicensePage session={session} license={license} />;
}
