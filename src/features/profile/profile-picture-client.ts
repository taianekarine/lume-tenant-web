import {
  PROFILE_PICTURE_MAX_BYTES,
  PROFILE_PICTURE_MAX_DIMENSION,
  PROFILE_PICTURE_MIN_DIMENSION,
  type ProfilePictureMime,
} from './profile-schema';

interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

function hasBytes(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function detectProfilePictureMime(bytes: Uint8Array): ProfilePictureMime | null {
  if (hasBytes(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) && hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

export function validateProfilePictureDimensions({ width, height }: ImageDimensions): void {
  if (width < PROFILE_PICTURE_MIN_DIMENSION || height < PROFILE_PICTURE_MIN_DIMENSION) {
    throw new Error('A imagem deve possuir no mínimo 128 × 128 pixels.');
  }
  if (width > PROFILE_PICTURE_MAX_DIMENSION || height > PROFILE_PICTURE_MAX_DIMENSION) {
    throw new Error('A imagem deve possuir no máximo 2048 × 2048 pixels.');
  }
}

async function readDimensionsWithImage(blob: Blob): Promise<ImageDimensions> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('Não foi possível ler as dimensões da imagem.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readProfilePictureDimensions(blob: Blob): Promise<ImageDimensions> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }
  return readDimensionsWithImage(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Imagem inválida.'));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareProfilePicture(
  file: File,
  readDimensions: (blob: Blob) => Promise<ImageDimensions> = readProfilePictureDimensions,
): Promise<string> {
  if (file.size === 0) throw new Error('A imagem selecionada está vazia.');
  if (file.size > PROFILE_PICTURE_MAX_BYTES) {
    throw new Error('A imagem deve possuir no máximo 512 KB.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectProfilePictureMime(bytes);
  if (!mime) throw new Error('Selecione uma imagem JPEG, PNG ou WebP válida.');

  const normalizedBlob = new Blob([bytes], { type: mime });
  validateProfilePictureDimensions(await readDimensions(normalizedBlob));
  return blobToDataUrl(normalizedBlob);
}
