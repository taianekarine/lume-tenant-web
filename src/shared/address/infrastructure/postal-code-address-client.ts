import { z } from 'zod';

import {
  PostalCodeLookupError,
  postalCodeDigits,
  type PostalCodeAddress,
} from '../domain/postal-code-address';

const postalCodeAddressSchema = z.object({
  postalCode: z.string(),
  street: z.string(),
  complement: z.string(),
  district: z.string(),
  city: z.string(),
  state: z.string(),
  ibgeCode: z.string(),
});

const postalCodeErrorSchema = z.object({
  reason: z.enum(['invalid', 'not-found', 'unavailable']),
  message: z.string(),
});

export async function lookupPostalCodeAddress(
  postalCode: string,
  signal?: AbortSignal,
): Promise<PostalCodeAddress> {
  const response = await fetch(`/api/postal-code/${postalCodeDigits(postalCode)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = postalCodeErrorSchema.safeParse(payload);
    throw new PostalCodeLookupError(
      error.success ? error.data.reason : 'unavailable',
      error.success
        ? error.data.message
        : 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.',
    );
  }

  const address = postalCodeAddressSchema.safeParse(payload);
  if (!address.success) {
    throw new PostalCodeLookupError(
      'unavailable',
      'O serviço de CEP devolveu uma resposta inválida. Preencha o endereço manualmente.',
    );
  }
  return address.data;
}
