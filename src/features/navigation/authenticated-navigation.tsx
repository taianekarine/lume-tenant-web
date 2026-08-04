'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellDot, ChevronRight } from 'lucide-react';

import type { User } from '@/features/auth/domain';
import { getPendingQuoteProposalCountAction } from '@/features/quote-proposals/actions';
import {
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/shared/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';

import { getAuthorizedNavigationItems } from './navigation-items';

export interface AuthenticatedNavigationProps {
  readonly user: User;
}

function isCurrentRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AuthenticatedNavigation({ user }: AuthenticatedNavigationProps) {
  const pathname = usePathname();
  const items = getAuthorizedNavigationItems(user);
  const canSeeProposals = items.some((item) => item.href === '/quote-proposals/pending');
  const [awaitingProposalCount, setAwaitingProposalCount] = useState<number | null>(null);

  useEffect(() => {
    if (!canSeeProposals) return;

    let active = true;
    const refresh = async () => {
      const result = await getPendingQuoteProposalCountAction();
      if (active && result.success) setAwaitingProposalCount(result.pendingTotal);
    };
    const receiveCount = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      if (Number.isInteger(count) && count >= 0) {
        setAwaitingProposalCount(count);
        return;
      }

      void refresh();
    };

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 15_000);
    window.addEventListener('quote-proposals:count', receiveCount);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('quote-proposals:count', receiveCount);
    };
  }, [canSeeProposals]);

  if (items.length === 0) return null;

  return (
    <>
      {[
        { label: 'Geral', items: items.filter((item) => item.group === 'general') },
        { label: 'Comercial', items: items.filter((item) => item.group === 'commercial') },
        {
          label: 'Pessoas',
          items: items.filter((item) => item.group === 'people-operations'),
        },
        {
          label: 'Administração',
          items: items.filter((item) => item.group === 'administration'),
        },
      ].map((group) =>
        group.items.length > 0 ? (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isQuoteFolder = item.href === '/quote-proposals/pending';
                  const active = isQuoteFolder
                    ? pathname.startsWith('/quote-proposals')
                    : isCurrentRoute(pathname, item.href);
                  const Icon = item.icon;
                  if (isQuoteFolder) {
                    const proposalRoutes = [
                      { label: 'Pendentes', href: '/quote-proposals/pending', priority: true },
                      { label: 'Enviadas', href: '/quote-proposals/sent' },
                      { label: 'Aprovadas', href: '/quote-proposals/approved' },
                      { label: 'Canceladas', href: '/quote-proposals/cancelled' },
                    ];

                    return (
                      <Collapsible
                        key={item.href}
                        defaultOpen={active}
                        className="group/quote-proposals"
                        render={<SidebarMenuItem />}
                      >
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={item.label}
                          render={
                            <Link
                              href={item.href}
                              aria-current={pathname === item.href ? 'page' : undefined}
                            />
                          }
                        >
                          <Icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {awaitingProposalCount !== null && awaitingProposalCount > 0 ? (
                          <SidebarMenuBadge
                            className="right-7 px-0 text-amber-600 dark:text-amber-400"
                            aria-label="Orçamentos com notificação pendente"
                          >
                            <BellDot aria-hidden="true" className="size-4" />
                          </SidebarMenuBadge>
                        ) : null}
                        <CollapsibleTrigger
                          render={
                            <SidebarMenuAction
                              aria-label="Alternar subpastas de Orçamentos"
                              className="transition-transform group-data-open/quote-proposals:rotate-90"
                            />
                          }
                        >
                          <ChevronRight aria-hidden="true" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {proposalRoutes.map((route) => {
                              const routeIsActive = pathname === route.href;
                              return (
                                <SidebarMenuSubItem key={route.href}>
                                  <SidebarMenuSubButton
                                    isActive={routeIsActive}
                                    render={
                                      <Link
                                        href={route.href}
                                        aria-current={routeIsActive ? 'page' : undefined}
                                      />
                                    }
                                  >
                                    <span className={route.priority ? 'font-semibold' : undefined}>
                                      {route.label}
                                    </span>
                                  </SidebarMenuSubButton>
                                  {route.priority && awaitingProposalCount !== null ? (
                                    <span
                                      aria-label={`${awaitingProposalCount} orçamentos pendentes`}
                                      className="pointer-events-none absolute top-1 right-2 inline-flex min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground tabular-nums"
                                    >
                                      {awaitingProposalCount > 99 ? '99+' : awaitingProposalCount}
                                    </span>
                                  ) : null}
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  }
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={
                          <Link href={item.href} aria-current={active ? 'page' : undefined} />
                        }
                      >
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null,
      )}
    </>
  );
}
