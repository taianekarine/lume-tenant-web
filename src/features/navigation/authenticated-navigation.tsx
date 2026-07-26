'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { User } from '@/features/auth/domain';

import { authenticatedNavigationStyles as styles } from './authenticated-navigation.styles';
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

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list()}>
      {items.map((item) => {
        const isActive = isCurrentRoute(pathname, item.href);
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={styles.link({ active: isActive })}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon aria-hidden="true" className={styles.icon()} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
