import type { ClientCategory, Permission } from '../entities';

export const DEFAULT_CLIENT_PERMISSIONS = {
  'continuous-charter': [
    'dashboard:view',
    'profile:view',
    'profile:update',
    'contracts:view',
    'quotes:view',
    'quotes:create',
    'trips:view',
    'documents:view',
    'invoices:view',
    'service-requests:view',
    'service-requests:create',
    'support:view',
    'support:create',
  ],

  'eventual-charter': [
    'dashboard:view',
    'profile:view',
    'profile:update',
    'contracts:view',
    'quotes:view',
    'quotes:create',
    'quotes:update',
    'trips:view',
    'documents:view',
    'invoices:view',
    'service-requests:view',
    'service-requests:create',
    'support:view',
    'support:create',
  ],
} as const satisfies Record<ClientCategory, readonly Permission[]>;
