const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveWhatsAppHistoryImportPath(
  method: string,
  path: readonly string[],
): string | null {
  if (method === 'GET' && path.length === 1 && path[0] === 'channels') {
    return '/channels';
  }
  if (method === 'GET' && path.length === 1 && path[0] === 'android-backups') {
    return '/android-backups';
  }
  if (path[0] !== 'batches') return null;
  const batchId = path[1];
  if (path.length === 1 && method === 'POST') return '';
  if (!batchId || !UUID_PATTERN.test(batchId)) return null;
  if (path.length === 2 && method === 'GET') return `/${batchId}`;
  if (path.length === 3 && path[2] === 'archives' && method === 'POST') {
    return `/${batchId}/archives`;
  }
  if (path.length === 3 && path[2] === 'android-backup' && method === 'POST') {
    return `/${batchId}/android-backup`;
  }
  if (path.length === 3 && path[2] === 'android-database-uploads' && method === 'POST') {
    return `/${batchId}/android-database-uploads`;
  }
  if (
    path.length === 5 &&
    path[2] === 'android-database-uploads' &&
    UUID_PATTERN.test(path[3] ?? '') &&
    path[4] === 'chunks' &&
    method === 'POST'
  ) {
    return `/${batchId}/android-database-uploads/${path[3]}/chunks`;
  }
  if (
    path.length === 5 &&
    path[2] === 'android-database-uploads' &&
    UUID_PATTERN.test(path[3] ?? '') &&
    path[4] === 'complete' &&
    method === 'POST'
  ) {
    return `/${batchId}/android-database-uploads/${path[3]}/complete`;
  }
  if (path.length === 3 && path[2] === 'android-divergences' && method === 'GET') {
    return `/${batchId}/android-divergences`;
  }
  if (path.length === 4 && path[2] === 'android-divergences' && path[3] && method === 'PATCH') {
    return `/${batchId}/android-divergences/${encodeURIComponent(path[3])}`;
  }
  if (path.length === 3 && path[2] === 'android-media-archives' && method === 'POST') {
    return `/${batchId}/android-media-archives`;
  }
  if (path.length === 3 && path[2] === 'android-media-uploads' && method === 'POST') {
    return `/${batchId}/android-media-uploads`;
  }
  if (
    path.length === 5 &&
    path[2] === 'android-media-uploads' &&
    UUID_PATTERN.test(path[3] ?? '') &&
    path[4] === 'chunks' &&
    method === 'POST'
  ) {
    return `/${batchId}/android-media-uploads/${path[3]}/chunks`;
  }
  if (
    path.length === 5 &&
    path[2] === 'android-media-uploads' &&
    UUID_PATTERN.test(path[3] ?? '') &&
    path[4] === 'complete' &&
    method === 'POST'
  ) {
    return `/${batchId}/android-media-uploads/${path[3]}/complete`;
  }
  if (path.length === 4 && path[2] === 'archives' && method === 'PATCH') {
    return `/${batchId}/archives/${encodeURIComponent(path[3])}`;
  }
  if (path.length === 3 && path[2] === 'workbook' && method === 'GET') {
    return `/${batchId}/workbook`;
  }
  if (path.length === 3 && path[2] === 'apply' && method === 'POST') {
    return `/${batchId}/apply`;
  }
  return null;
}
