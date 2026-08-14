import { NextResponse } from 'next/server';

import { TenantAdministrationError } from '@/features/tenant-administration/application';
import { executeAuthenticatedTenantMutation } from '@/features/tenant-administration/server';

export const dynamic = 'force-dynamic';

function errorStatus(error: TenantAdministrationError): number {
  if (error.code === 'unauthorized') return 401;
  if (error.code === 'forbidden') return 403;
  if (error.code === 'not-found') return 404;
  return 503;
}

export async function GET() {
  try {
    const profile = await executeAuthenticatedTenantMutation((gateway) => gateway.getProfile());
    return NextResponse.json({ profilePictureDataUrl: profile.profilePictureDataUrl });
  } catch (error) {
    if (error instanceof TenantAdministrationError) {
      return NextResponse.json({ message: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json(
      { message: 'Não foi possível carregar a foto do perfil.' },
      { status: 503 },
    );
  }
}
