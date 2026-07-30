import {
  detectProfilePictureMime,
  prepareProfilePicture,
  validateProfilePictureDimensions,
} from './profile-picture-client';

describe('profile picture client validation', () => {
  it.each([
    [new Uint8Array([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'],
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    [
      new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
      'image/webp',
    ],
  ])('detects supported image content instead of trusting the file name', (bytes, mime) => {
    expect(detectProfilePictureMime(bytes)).toBe(mime);
  });

  it('rejects content that is not a supported image', () => {
    expect(detectProfilePictureMime(new Uint8Array([0x01, 0x02, 0x03]))).toBeNull();
  });

  it('accepts dimensions at the documented boundaries', () => {
    expect(() => validateProfilePictureDimensions({ width: 128, height: 128 })).not.toThrow();
    expect(() => validateProfilePictureDimensions({ width: 2048, height: 2048 })).not.toThrow();
  });

  it('rejects dimensions outside the documented boundaries', () => {
    expect(() => validateProfilePictureDimensions({ width: 127, height: 128 })).toThrow(
      'A imagem deve possuir no mínimo 128 × 128 pixels.',
    );
    expect(() => validateProfilePictureDimensions({ width: 2049, height: 2048 })).toThrow(
      'A imagem deve possuir no máximo 2048 × 2048 pixels.',
    );
  });

  it('accepts a file without a conventional name when its content is a valid image', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    const file = {
      name: 'eu',
      type: 'application/octet-stream',
      size: bytes.byteLength,
      arrayBuffer: async () => bytes.buffer,
    } as File;

    await expect(
      prepareProfilePicture(file, async () => ({ width: 256, height: 256 })),
    ).resolves.toBe('data:image/jpeg;base64,/9j/AA==');
  });
});
