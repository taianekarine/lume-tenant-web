import type { Permission, User } from '../entities';

export function hasPermission(user: User, permission: Permission): boolean {
  if (!user.isActive) {
    return false;
  }

  return user.permissions.includes(permission);
}
