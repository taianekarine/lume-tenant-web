import type { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

import { tenantBranding } from '@/config/tenant-branding';
import { LogoutButton } from '@/features/auth/components';
import type { User } from '@/features/auth/domain';

import { AuthenticatedNavigation } from './authenticated-navigation';
import { authenticatedShellStyles as styles } from './authenticated-shell.styles';

export interface AuthenticatedShellProps {
  readonly user: User;
  readonly children: ReactNode;
}

export function AuthenticatedShell({ user, children }: AuthenticatedShellProps) {
  return (
    <div className={styles.shell()}>
      <header className={styles.header()}>
        <div className={styles.headerContent()}>
          <Link href="/dashboard" className={styles.brand()}>
            <span className={styles.brandIcon()}>
              <LayoutDashboard aria-hidden="true" />
            </span>
            <span className={styles.brandText()}>
              <span className={styles.brandName()}>{tenantBranding.productName}</span>
              <span className={styles.brandArea()}>Área protegida</span>
            </span>
          </Link>

          <nav aria-label="Navegação da área interna" className={styles.navigation()}>
            <AuthenticatedNavigation user={user} />
            <LogoutButton />
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
