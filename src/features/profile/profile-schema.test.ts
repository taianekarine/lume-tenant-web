import { PROFILE_PICTURE_MAX_BYTES, profilePictureSchema } from './profile-schema';

describe('profilePictureSchema', () => {
  it('accepts the supported image data URL formats', () => {
    for (const mime of ['jpeg', 'png', 'webp']) {
      expect(
        profilePictureSchema.safeParse({
          dataUrl: `data:image/${mime};base64,AQID`,
        }).success,
      ).toBe(true);
    }
  });

  it('rejects unsupported image formats', () => {
    const result = profilePictureSchema.safeParse({
      dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Selecione uma imagem JPEG, PNG ou WebP válida.',
      );
    }
  });

  it('rejects a decoded image larger than 512 KB', () => {
    const result = profilePictureSchema.safeParse({
      dataUrl: `data:image/png;base64,${Buffer.alloc(PROFILE_PICTURE_MAX_BYTES + 1).toString('base64')}`,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('A imagem deve possuir no máximo 512 KB.');
    }
  });
});
