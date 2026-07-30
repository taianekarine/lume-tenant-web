'use client';

import { LayoutGrid } from 'lucide-react';

import { tenantBranding } from '@/config/tenant-branding';
import type { User } from '@/features/auth/domain';
import { AuthenticatedNavigation } from '@/features/navigation/authenticated-navigation';
import { NavUser } from '@/shared/nav-user';
import { TeamSwitcher } from '@/shared/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/shared/ui/sidebar';

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  readonly user: User;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const tenantLogo = tenantBranding.logoUrl ? (
    <span
      role="img"
      aria-label={`Logo ${tenantBranding.tenantName}`}
      className="size-5 bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url("${tenantBranding.logoUrl}")` }}
    />
  ) : (
    <LayoutGrid aria-hidden="true" />
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: tenantBranding.tenantName,
              logo: tenantLogo,
              plan: 'Área protegida',
            },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Navegação da área interna">
          <AuthenticatedNavigation user={user} />
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
