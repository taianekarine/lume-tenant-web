import type { User } from '../entities';
import { hasPermission } from '../services/has-permission';
import { hasManagementLeadershipScope } from './organizational-access';

export function canAccessLicense(user: User): boolean {
  return hasManagementLeadershipScope(user) && hasPermission(user, 'license:view');
}
