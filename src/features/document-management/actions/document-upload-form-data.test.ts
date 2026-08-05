import { buildDocumentUploadFormData } from './document-upload-form-data';

function file(name: string): File {
  return new File(['content'], name, { type: 'image/jpeg' });
}

describe('buildDocumentUploadFormData', () => {
  it('envia somente o contrato aceito pela API', () => {
    const source = new FormData();
    source.set('$ACTION_REF_16', 'internal');
    source.set('$ACTION_16:0', 'internal');
    source.set('requiresFrontBack', 'false');
    source.append('files', file('foto.jpg'));

    const result = buildDocumentUploadFormData(source, 'command-id');

    expect([...result.keys()]).toEqual(['commandId', 'files', 'sides', 'pageNumbers']);
    expect(result.get('$ACTION_REF_16')).toBeNull();
    expect(result.get('commandId')).toBe('command-id');
  });

  it('agrupa frente e verso por filho', () => {
    const source = new FormData();
    source.set('requiresFrontBack', 'true');
    for (const name of [
      'filho-1-frente.jpg',
      'filho-1-verso.jpg',
      'filho-2-frente.jpg',
      'filho-2-verso.jpg',
    ]) {
      source.append('files', file(name));
    }

    const result = buildDocumentUploadFormData(source, 'command-id');

    expect(result.get('sides')).toBe('front,back,front,back');
    expect(result.get('pageNumbers')).toBe('1,1,2,2');
  });

  it('numera documentos de vários filhos na ordem selecionada', () => {
    const source = new FormData();
    source.set('requiresFrontBack', 'false');
    source.append('files', file('filho-1.jpg'));
    source.append('files', file('filho-2.jpg'));

    const result = buildDocumentUploadFormData(source, 'command-id');

    expect(result.get('sides')).toBe('page,page');
    expect(result.get('pageNumbers')).toBe('1,2');
  });
});
