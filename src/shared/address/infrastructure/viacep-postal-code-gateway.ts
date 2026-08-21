import { z } from 'zod';

import {
  formatPostalCode,
  isValidPostalCode,
  PostalCodeLookupError,
  postalCodeDigits,
  type PostalCodeAddress,
} from '../domain/postal-code-address';

const viaCepAddressSchema = z.object({
  cep: z.string(),
  logradouro: z.string(),
  complemento: z.string(),
  bairro: z.string(),
  localidade: z.string(),
  uf: z.string(),
  ibge: z.string(),
});

const viaCepNotFoundSchema = z.object({ erro: z.literal(true) });

export async function findAddressByPostalCode(
  postalCode: string,
  fetcher: typeof fetch = fetch,
): Promise<PostalCodeAddress> {
  if (!isValidPostalCode(postalCode)) {
    throw new PostalCodeLookupError('invalid', 'Informe um CEP com oito dígitos.');
  }

  const digits = postalCodeDigits(postalCode);
  let response: Response;
  try {
    response = await fetcher(`https://viacep.com.br/ws/${digits}/json/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new PostalCodeLookupError(
      'unavailable',
      'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.',
    );
  }

  if (!response.ok) {
    throw new PostalCodeLookupError(
      'unavailable',
      'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.',
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PostalCodeLookupError(
      'unavailable',
      'O serviço de CEP devolveu uma resposta inválida. Preencha o endereço manualmente.',
    );
  }

  if (viaCepNotFoundSchema.safeParse(payload).success) {
    throw new PostalCodeLookupError('not-found', 'CEP não encontrado.');
  }

  const parsed = viaCepAddressSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PostalCodeLookupError(
      'unavailable',
      'O serviço de CEP devolveu uma resposta inválida. Preencha o endereço manualmente.',
    );
  }

  return {
    postalCode: formatPostalCode(parsed.data.cep),
    street: parsed.data.logradouro,
    complement: parsed.data.complemento,
    district: parsed.data.bairro,
    city: parsed.data.localidade,
    state: parsed.data.uf.toUpperCase(),
    ibgeCode: parsed.data.ibge,
  };
}
