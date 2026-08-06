function optionalPublicValue(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

const tenantName = optionalPublicValue(process.env.NEXT_PUBLIC_TENANT_NAME) ?? 'Empresa';
const productName = optionalPublicValue(process.env.NEXT_PUBLIC_TENANT_PRODUCT_NAME) ?? 'Lume';

export const tenantBranding = {
  tenantName,
  productName,
} as const;
