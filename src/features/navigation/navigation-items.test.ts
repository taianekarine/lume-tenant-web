import { FileText, LayoutDashboard } from 'lucide-react';

import type { EmployeeUser } from '@/features/auth/domain';

import {
  getAuthorizedNavigationItems,
  INTERNAL_NAVIGATION_ITEMS,
  type InternalNavigationItem,
} from './navigation-items';

function createEmployee(permissions: EmployeeUser['permissions'], isActive = true): EmployeeUser {
  return {
    id: 'employee-001',
    name: 'Maria Silva',
    type: 'employee',
    departments: ['commercial'],
    roles: ['manager'],
    permissions,
    clientCategory: null,
    isActive,
  };
}

describe('getAuthorizedNavigationItems', () => {
  it('returns an implemented route when the user has its permission', () => {
    const items = getAuthorizedNavigationItems(createEmployee(['dashboard:view']));

    expect(items.map((item) => item.label)).toEqual(['Dashboard', 'Licença']);
    expect(INTERNAL_NAVIGATION_ITEMS).toHaveLength(6);
  });

  it('filters each navigation destination by its required permission', () => {
    const items: readonly InternalNavigationItem[] = [
      {
        label: 'Dashboard',
        href: '/dashboard',
        permission: 'dashboard:view',
        icon: LayoutDashboard,
      },
      {
        label: 'Relatórios',
        href: '/reports',
        permission: 'reports:view',
        icon: FileText,
      },
    ];

    const authorizedItems = getAuthorizedNavigationItems(createEmployee(['reports:view']), items);

    expect(authorizedItems.map((item) => item.label)).toEqual(['Relatórios']);
  });

  it('does not expose destinations to an inactive user', () => {
    const items = getAuthorizedNavigationItems(createEmployee(['dashboard:view'], false));

    expect(items).toEqual([]);
  });
});
