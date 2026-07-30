import { z } from 'zod';

export const PROFILE_PICTURE_MIN_DIMENSION = 128;
export const PROFILE_PICTURE_MAX_DIMENSION = 2048;
export const PROFILE_PICTURE_MAX_BYTES = 512 * 1024;
export const PROFILE_PICTURE_MAX_DATA_URL_LENGTH = 700_000;
export const PROFILE_PICTURE_ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type ProfilePictureMime = (typeof PROFILE_PICTURE_ACCEPTED_MIME_TYPES)[number];

function decodedBase64Size(value: string): number {
  const base64 = value.slice(value.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

const profilePictureDataUrlSchema = z
  .string()
  .max(PROFILE_PICTURE_MAX_DATA_URL_LENGTH)
  .regex(
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    'Selecione uma imagem JPEG, PNG ou WebP válida.',
  )
  .refine((value) => decodedBase64Size(value) <= PROFILE_PICTURE_MAX_BYTES, {
    message: 'A imagem deve possuir no máximo 512 KB.',
  });

export const profilePictureSchema = z.object({
  dataUrl: profilePictureDataUrlSchema.nullable(),
});

export const ownPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.').max(72),
    newPassword: z
      .string()
      .min(12, 'A nova senha deve ter ao menos 12 caracteres.')
      .max(72)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        'Inclua maiúscula, minúscula, número e símbolo.',
      ),
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    message: 'As senhas não conferem.',
    path: ['confirmation'],
  });

export type ProfilePictureForm = z.infer<typeof profilePictureSchema>;
export type OwnPasswordForm = z.infer<typeof ownPasswordSchema>;
