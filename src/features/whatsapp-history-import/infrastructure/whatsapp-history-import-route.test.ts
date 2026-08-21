import { sanitizeWhatsAppHistoryImportResponse } from './tenant-api-whatsapp-history-import-gateway';
import { resolveWhatsAppHistoryImportPath } from './whatsapp-history-import-route';

const BATCH_ID = '11111111-1111-4111-8111-111111111111';
const UPLOAD_ID = '22222222-2222-4222-8222-222222222222';

describe('resolveWhatsAppHistoryImportPath', () => {
  it.each([
    ['GET', ['channels'], '/channels'],
    ['GET', ['android-backups'], '/android-backups'],
    ['POST', ['batches'], ''],
    ['GET', ['batches', 'active'], '/active'],
    ['GET', ['batches', BATCH_ID], `/${BATCH_ID}`],
    ['DELETE', ['batches', BATCH_ID], `/${BATCH_ID}`],
    ['GET', ['batches', BATCH_ID, 'uploads', UPLOAD_ID], `/${BATCH_ID}/uploads/${UPLOAD_ID}`],
    ['DELETE', ['batches', BATCH_ID, 'uploads', UPLOAD_ID], `/${BATCH_ID}/uploads/${UPLOAD_ID}`],
    ['POST', ['batches', BATCH_ID, 'archives'], `/${BATCH_ID}/archives`],
    ['POST', ['batches', BATCH_ID, 'android-backup'], `/${BATCH_ID}/android-backup`],
    [
      'POST',
      ['batches', BATCH_ID, 'android-database-uploads'],
      `/${BATCH_ID}/android-database-uploads`,
    ],
    [
      'POST',
      ['batches', BATCH_ID, 'android-database-uploads', UPLOAD_ID, 'chunks'],
      `/${BATCH_ID}/android-database-uploads/${UPLOAD_ID}/chunks`,
    ],
    [
      'POST',
      ['batches', BATCH_ID, 'android-database-uploads', UPLOAD_ID, 'complete'],
      `/${BATCH_ID}/android-database-uploads/${UPLOAD_ID}/complete`,
    ],
    ['GET', ['batches', BATCH_ID, 'android-divergences'], `/${BATCH_ID}/android-divergences`],
    [
      'PATCH',
      ['batches', BATCH_ID, 'android-divergences', 'message/unsafe'],
      `/${BATCH_ID}/android-divergences/message%2Funsafe`,
    ],
    [
      'POST',
      ['batches', BATCH_ID, 'android-media-archives'],
      `/${BATCH_ID}/android-media-archives`,
    ],
    ['POST', ['batches', BATCH_ID, 'android-media-uploads'], `/${BATCH_ID}/android-media-uploads`],
    [
      'POST',
      ['batches', BATCH_ID, 'android-media-uploads', UPLOAD_ID, 'chunks'],
      `/${BATCH_ID}/android-media-uploads/${UPLOAD_ID}/chunks`,
    ],
    [
      'POST',
      ['batches', BATCH_ID, 'android-media-uploads', UPLOAD_ID, 'complete'],
      `/${BATCH_ID}/android-media-uploads/${UPLOAD_ID}/complete`,
    ],
    [
      'PATCH',
      ['batches', BATCH_ID, 'archives', 'archive/unsafe'],
      `/${BATCH_ID}/archives/archive%2Funsafe`,
    ],
    ['GET', ['batches', BATCH_ID, 'workbook'], `/${BATCH_ID}/workbook`],
    ['POST', ['batches', BATCH_ID, 'apply'], `/${BATCH_ID}/apply`],
  ])('mapeia %s %j para o endpoint permitido', (method, path, expected) => {
    expect(resolveWhatsAppHistoryImportPath(method, path)).toBe(expected);
  });

  it.each([
    ['GET', ['batches', 'not-a-uuid']],
    ['GET', ['unknown']],
    ['POST', ['batches', BATCH_ID, 'workbook']],
    ['POST', ['batches', BATCH_ID, 'android-divergences']],
    ['PATCH', ['batches', BATCH_ID, 'android-divergences']],
  ])('rejeita rota fora da lista permitida: %s %j', (method, path) => {
    expect(resolveWhatsAppHistoryImportPath(method, path)).toBeNull();
  });
});

describe('sanitizeWhatsAppHistoryImportResponse', () => {
  it('preserva respostas funcionais da API', async () => {
    const upstream = Response.json({ id: 'batch-id' }, { status: 201 });

    await expect(sanitizeWhatsAppHistoryImportResponse(upstream)).resolves.toBe(upstream);
  });

  it('substitui detalhes internos de falhas inesperadas por uma mensagem segura', async () => {
    const response = await sanitizeWhatsAppHistoryImportResponse(
      Response.json({ message: 'EACCES: permission denied' }, { status: 500 }),
    );

    await expect(response.json()).resolves.toEqual({
      message:
        'Não foi possível iniciar a importação. Tente novamente e, se o problema continuar, contate o suporte.',
    });
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
