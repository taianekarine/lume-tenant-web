function filesFrom(source: FormData): File[] {
  return source
    .getAll('files')
    .filter((entry): entry is File => typeof entry !== 'string' && entry.size > 0);
}

export function buildDocumentUploadFormData(source: FormData, commandId: string): FormData {
  const upload = new FormData();
  const files = filesFrom(source);
  const requiresFrontBack = source.get('requiresFrontBack') === 'true';

  upload.set('commandId', commandId);
  for (const file of files) upload.append('files', file);

  if (requiresFrontBack) {
    upload.set('sides', files.map((_, index) => (index % 2 === 0 ? 'front' : 'back')).join(','));
    upload.set('pageNumbers', files.map((_, index) => String(Math.floor(index / 2) + 1)).join(','));
  } else if (files.length > 1) {
    upload.set('sides', files.map(() => 'page').join(','));
    upload.set('pageNumbers', files.map((_, index) => String(index + 1)).join(','));
  } else {
    upload.set('sides', 'single');
    upload.set('pageNumbers', '1');
  }

  return upload;
}
