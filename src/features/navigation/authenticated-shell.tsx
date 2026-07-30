'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { tenantBranding } from '@/config/tenant-branding';
import type { User } from '@/features/auth/domain';
import { AppSidebar } from '@/shared/app-sidebar';
import { CurrentUserProfilePictureProvider } from '@/shared/current-user-avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/ui/sidebar';

import { getAuthorizedNavigationItems } from './navigation-items';
import { CommercialNotificationCenter } from './commercial-notification-center';
import { ThemeToggle } from './theme-toggle';

export interface AuthenticatedShellProps {
  readonly user: User;
  readonly children: ReactNode;
}

export function AuthenticatedShell({ user, children }: AuthenticatedShellProps) {
  const pathname = usePathname();
  const currentItem = getAuthorizedNavigationItems(user).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const quoteRouteLabel = {
    '/quote-proposals/pending': 'Orçamentos · Pendentes',
    '/quote-proposals/sent': 'Orçamentos · Enviadas',
    '/quote-proposals/approved': 'Orçamentos · Aprovadas',
    '/quote-proposals/cancelled': 'Orçamentos · Canceladas',
  }[pathname];

  return (
    <CurrentUserProfilePictureProvider key={user.id} userId={user.id}>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger aria-label="Alternar menu lateral" />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden text-muted-foreground sm:block">
                  {tenantBranding.productName}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-semibold">
                    {quoteRouteLabel ?? currentItem?.label ?? 'Área interna'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-1">
              <CommercialNotificationCenter user={user} />
              <ThemeToggle />
            </div>
          </header>
          <div className="min-w-0 flex-1">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </CurrentUserProfilePictureProvider>
  );
}
