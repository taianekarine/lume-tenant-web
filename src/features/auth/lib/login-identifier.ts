export type LoginIdentifierType = 'username' | 'email' | 'unsupported-document';

export type NormalizedLoginIdentifier = {
  type: LoginIdentifierType;
  value: string;
};

export type LoginIdentifierValidation = {
  isValid: boolean;
  message: string | null;
};

function hasDocumentFormat(value: string): boolean {
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

  if (hasDocumentFormat(trimmedIdentifier)) {
    return {
      type: 'unsupported-document',
      value: trimmedIdentifier,
    };
  }

  if (trimmedIdentifier.includes('@')) {
    return {
      type: 'email',
      value: trimmedIdentifier.toLocaleLowerCase('pt-BR'),
    };
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
      message: 'Informe seu usuário ou e-mail.',
    };
  }

  if (identifier.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.value)) {
    return {
      isValid: false,
      message: 'Informe um e-mail válido.',
    };
  }

  if (identifier.type === 'unsupported-document') {
    return {
      isValid: false,
      message: 'Informe um usuário ou e-mail válido.',
    };
  }

  return {
    isValid: true,
    message: null,
  };
}
