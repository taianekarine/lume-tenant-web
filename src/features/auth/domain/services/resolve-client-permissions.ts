import type { ClientCategory, Permission } from '../entities';
import { DEFAULT_CLIENT_PERMISSIONS } from '../policies';

export function resolveClientPermissions(clientCategory: ClientCategory): Permission[] {
  return [...DEFAULT_CLIENT_PERMISSIONS[clientCategory]];
}
