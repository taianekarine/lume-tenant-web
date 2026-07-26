function optionalPublicValue(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

const tenantName = optionalPublicValue(process.env.NEXT_PUBLIC_TENANT_NAME) ?? 'Empresa';
const productName =
  optionalPublicValue(process.env.NEXT_PUBLIC_TENANT_PRODUCT_NAME) ?? `${tenantName} Lume`;

export const tenantBranding = {
  tenantName,
  productName,
  logoUrl: optionalPublicValue(process.env.NEXT_PUBLIC_TENANT_LOGO_URL),
  primaryColor: optionalPublicValue(process.env.NEXT_PUBLIC_TENANT_PRIMARY_COLOR) ?? '#1d4ed8',
} as const;
