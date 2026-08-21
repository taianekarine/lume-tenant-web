import { resolveWhatsAppContactsPath } from './whatsapp-contacts-route';

const CONTACT_ID = '11111111-1111-4111-8111-111111111111';

describe('resolveWhatsAppContactsPath', () => {
  it.each([
    ['GET', [], ''],
    ['POST', [], ''],
    ['POST', ['import'], '/import'],
    ['PATCH', [CONTACT_ID], `/${CONTACT_ID}`],
    ['DELETE', [CONTACT_ID], `/${CONTACT_ID}`],
  ])('mapeia %s %j', (method, path, expected) => {
    expect(resolveWhatsAppContactsPath(method, path)).toBe(expected);
  });

  it.each([
    ['DELETE', []],
    ['GET', ['import']],
    ['PATCH', ['invalid']],
  ])('rejeita %s %j', (method, path) => {
    expect(resolveWhatsAppContactsPath(method, path)).toBeNull();
  });
});
