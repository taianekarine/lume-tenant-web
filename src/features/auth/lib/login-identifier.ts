import { normalizeCpf, onlyDigits, validateCpf } from '@/shared/utils/brazilian-data';

export type LoginIdentifierType = 'username' | 'cpf' | 'unsupported-client-document';

export type NormalizedLoginIdentifier = {
  type: LoginIdentifierType;
  value: string;
};

export type LoginIdentifierValidation = {
  isValid: boolean;
  message: string | null;
};

function hasNumericDocumentFormat(value: string): boolean {
  return /^[\d./\-\s]+$/.test(value);
}

export function normalizeLoginIdentifier(identifier: string): NormalizedLoginIdentifier {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return {
      type: 'username',
      value: '',
    };
  }

  if (hasNumericDocumentFormat(trimmedIdentifier)) {
    const digits = onlyDigits(trimmedIdentifier);

    if (digits.length === 11) {
      return {
        type: 'cpf',
        value: normalizeCpf(trimmedIdentifier),
      };
    }

    if (digits.length === 14) {
      return {
        type: 'unsupported-client-document',
        value: digits,
      };
    }
  }

  return {
    type: 'username',
    value: trimmedIdentifier,
  };
}

export function validateLoginIdentifier(
  identifier: NormalizedLoginIdentifier,
): LoginIdentifierValidation {
  if (!identifier.value) {
    return {
      isValid: false,
      message: 'Informe seu usuário, e-mail ou CPF.',
    };
  }

  if (identifier.type === 'cpf' && !validateCpf(identifier.value)) {
    return {
      isValid: false,
      message: 'Informe um CPF válido.',
    };
  }

  if (identifier.type === 'unsupported-client-document') {
    return {
      isValid: false,
      message: 'O acesso por CNPJ ainda não está disponível.',
    };
  }

  return {
    isValid: true,
    message: null,
  };
}
