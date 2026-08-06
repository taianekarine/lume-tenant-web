'use client';

import type { User } from '@/features/auth/domain';
import { AuthenticatedNavigation } from '@/features/navigation/authenticated-navigation';
import { LumeBrand } from '@/shared/lume-brand';
import { NavUser } from '@/shared/nav-user';
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center overflow-hidden rounded-xl px-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!">
          <LumeBrand
            compact
            className="gap-2 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span:last-child]:hidden"
          />
        </div>
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
