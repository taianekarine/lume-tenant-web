import 'server-only';

import { resolveTenantApiBaseUrl, resolveTenantApiTimeout } from '@/features/auth/infrastructure';

import type { QuoteProposalRepository } from '../application';
import { LumeApiQuoteProposalRepository } from './tenant-api-quote-proposal-repository';

export function createQuoteProposalRepository(accessToken: string): QuoteProposalRepository {
  if (!accessToken.trim()) {
    throw new Error('An authenticated Tenant API access token is required.');
  }

  return new LumeApiQuoteProposalRepository(
    resolveTenantApiBaseUrl(process.env.LUME_TENANT_API_URL),
    accessToken,
    fetch,
    resolveTenantApiTimeout(process.env.LUME_TENANT_API_TIMEOUT_MS),
  );
}
