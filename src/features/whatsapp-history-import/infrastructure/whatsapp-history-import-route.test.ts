import { resolveWhatsAppHistoryImportPath } from './whatsapp-history-import-route';

const BATCH_ID = '11111111-1111-4111-8111-111111111111';

describe('resolveWhatsAppHistoryImportPath', () => {
  it.each([
    ['GET', ['channels'], '/channels'],
    ['POST', ['batches'], ''],
    ['GET', ['batches', BATCH_ID], `/${BATCH_ID}`],
    ['POST', ['batches', BATCH_ID, 'archives'], `/${BATCH_ID}/archives`],
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
    ['DELETE', ['batches', BATCH_ID]],
    ['GET', ['batches', 'not-a-uuid']],
    ['GET', ['unknown']],
    ['POST', ['batches', BATCH_ID, 'workbook']],
  ])('rejeita rota fora da lista permitida: %s %j', (method, path) => {
    expect(resolveWhatsAppHistoryImportPath(method, path)).toBeNull();
  });
});
