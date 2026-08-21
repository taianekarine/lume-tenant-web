import { NextResponse } from 'next/server';

import { PostalCodeLookupError } from '@/shared/address/domain/postal-code-address';
import { findAddressByPostalCode } from '@/shared/address/infrastructure/viacep-postal-code-gateway';

const responseHeaders = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};

export async function GET(
  _: Request,
  { params }: { readonly params: Promise<{ postalCode: string }> },
) {
  const { postalCode } = await params;
  try {
    const address = await findAddressByPostalCode(postalCode);
    return NextResponse.json(address, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof PostalCodeLookupError) {
      const status = error.reason === 'invalid' ? 400 : error.reason === 'not-found' ? 404 : 502;
      return NextResponse.json(
        { reason: error.reason, message: error.message },
        { status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      {
        reason: 'unavailable',
        message: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
