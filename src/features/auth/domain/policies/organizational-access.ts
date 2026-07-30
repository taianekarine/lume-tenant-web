import type { User } from '../entities';

export function hasManagementLeadershipScope(user: User): boolean {
  return user.isActive && user.type === 'employee' && user.departments.includes('management');
}

export function hasCommercialScope(user: User): boolean {
  return user.isActive && user.type === 'employee' && user.departments.includes('commercial');
}
