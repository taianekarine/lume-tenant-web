/**
 * Normaliza o número do RG antigo, preservando números e letras.
 *
 * O RG não possui uma máscara ou algoritmo de validação nacional único,
 * pois sua emissão era responsabilidade dos estados.
 *
 * Para a Carteira de Identidade Nacional — CIN, utilize as funções de CPF,
 * pois o CPF é o número único de identificação do novo documento.
 *
 * @example
 * normalizeRg("18.787.6-5 MG");
 * // "1878765MG"
 *
 * @example
 * normalizeRg("12.345.678-X");
 * // "12345678X"
 */
export function normalizeRg(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}
