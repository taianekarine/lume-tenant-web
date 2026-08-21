const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveWhatsAppContactsPath(
  method: string,
  path: readonly string[] = [],
): string | null {
  if (path.length === 0 && (method === 'GET' || method === 'POST')) return '';
  if (path.length === 1 && path[0] === 'import' && method === 'POST') return '/import';
  if (
    path.length === 1 &&
    UUID_PATTERN.test(path[0] ?? '') &&
    (method === 'PATCH' || method === 'DELETE')
  ) {
    return `/${path[0]}`;
  }
  return null;
}
