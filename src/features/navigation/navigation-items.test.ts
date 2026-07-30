import { FileText, LayoutDashboard } from 'lucide-react';

import type { EmployeeUser } from '@/features/auth/domain';

import {
  getAuthorizedNavigationItems,
  INTERNAL_NAVIGATION_ITEMS,
  type InternalNavigationItem,
} from './navigation-items';

function createEmployee(
  permissions: EmployeeUser['permissions'],
  isActive = true,
  departments: readonly string[] = ['commercial'],
): EmployeeUser {
  return {
    id: 'employee-001',
    name: 'Maria Silva',
    type: 'employee',
    departments,
    permissions,
    clientCategory: null,
    isActive,
  };
}

describe('getAuthorizedNavigationItems', () => {
  it('returns an implemented route when the user has its permission', () => {
    const items = getAuthorizedNavigationItems(createEmployee(['dashboard:view']));

    expect(items.map((item) => item.label)).toEqual(['Dashboard']);
    expect(INTERNAL_NAVIGATION_ITEMS).toHaveLength(7);
  });

  it('shows License only with its explicit permission inside Management', () => {
    const items = getAuthorizedNavigationItems(
      createEmployee(['dashboard:view', 'license:view'], true, ['management']),
    );

    expect(items.map((item) => item.label)).toContain('Licença');
  });

  it.each(['users:view', 'users:manage'] as const)(
    'shows Users inside Management with %s',
    (permission) => {
      const items = getAuthorizedNavigationItems(
        createEmployee([permission], true, ['management']),
      );

      expect(items.map((item) => item.label)).toContain('Usuários');
    },
  );

  it('requires the explicit license permission inside Management', () => {
    const items = getAuthorizedNavigationItems(
      createEmployee(['dashboard:view'], true, ['management']),
    );

    expect(items.map((item) => item.label)).toEqual(['Dashboard']);
    expect(items.map((item) => item.label)).not.toContain('Licença');
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

  it('exposes the proposal queue only to WhatsApp attendants', () => {
    const items = getAuthorizedNavigationItems(
      createEmployee(['dashboard:view', 'whatsapp-conversations:manage']),
    );

    expect(items.map((item) => item.label)).toContain('Orçamentos');
    expect(items.find((item) => item.label === 'Orçamentos')?.href).toBe(
      '/quote-proposals/pending',
    );
  });

  it('does not grant administration or commercial navigation outside the linked department', () => {
    const commercialAdministrator = getAuthorizedNavigationItems(
      createEmployee(['dashboard:view', 'users:view'], true, ['commercial']),
    );
    const operationsWithWhatsAppPermission = getAuthorizedNavigationItems(
      createEmployee(['dashboard:view', 'whatsapp-conversations:manage'], true, ['operations']),
    );

    expect(commercialAdministrator.map((item) => item.label)).not.toContain('Usuários');
    expect(commercialAdministrator.map((item) => item.label)).not.toContain('Licença');
    expect(operationsWithWhatsAppPermission.map((item) => item.label)).not.toContain(
      'Painel WhatsApp',
    );
    expect(operationsWithWhatsAppPermission.map((item) => item.label)).not.toContain('Orçamentos');
  });

  it('does not expose destinations to an inactive user', () => {
    const items = getAuthorizedNavigationItems(createEmployee(['dashboard:view'], false));

    expect(items).toEqual([]);
  });
});
