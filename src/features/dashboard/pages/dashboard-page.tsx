import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';

import { tenantBranding } from '@/config/tenant-branding';
import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

import { dashboardPageStyles as styles } from './dashboard-page.styles';

export interface DashboardPageProps {
  readonly session: AuthenticatedSession;
}

function getProfileLabel(session: AuthenticatedSession): string {
  if (session.user.type === 'employee') {
    return 'Colaborador interno';
  }

  return session.user.clientCategory === 'continuous-charter'
    ? 'Cliente de fretamento contínuo'
    : 'Cliente de fretamento eventual';
}

export function DashboardPage({ session }: DashboardPageProps) {
  const profileLabel = getProfileLabel(session);

  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content()}>
        <p className={styles.eyebrow()}>Olá, {session.user.name}</p>
        <h1 className={styles.title()}>
          Sua área na {tenantBranding.tenantName} já está protegida.
        </h1>
        <p className={styles.description()}>
          Este é o primeiro espaço interno da plataforma. Os próximos módulos serão exibidos
          conforme as permissões de cada perfil.
        </p>

        <div className={styles.cardGrid()}>
          <Card className={styles.card()}>
            <CardHeader className={styles.cardHeader()}>
              <span className={styles.cardIcon()}>
                <ShieldCheck aria-hidden="true" />
              </span>
              <CardTitle className={styles.cardTitle()}>Sessão protegida</CardTitle>
              <CardDescription className={styles.cardDescription()}>
                Seu acesso foi validado no servidor antes desta página ser exibida.
              </CardDescription>
            </CardHeader>
            <CardContent className={styles.cardContent()}>
              <p className={styles.cardValue()}>Ativa</p>
              <p className={styles.cardDetail()}>
                A sessão pode ser encerrada com segurança pelo menu superior.
              </p>
            </CardContent>
          </Card>

          <Card className={styles.card()}>
            <CardHeader className={styles.cardHeader()}>
              <span className={styles.cardIcon()}>
                <UserRound aria-hidden="true" />
              </span>
              <CardTitle className={styles.cardTitle()}>Perfil de acesso</CardTitle>
              <CardDescription className={styles.cardDescription()}>
                A experiência é adaptada ao vínculo do usuário com {tenantBranding.tenantName}.
              </CardDescription>
            </CardHeader>
            <CardContent className={styles.cardContent()}>
              <p className={styles.cardValue()}>{profileLabel}</p>
              <p className={styles.cardDetail()}>
                Apenas recursos autorizados serão disponibilizados.
              </p>
            </CardContent>
          </Card>

          <Card className={styles.card()}>
            <CardHeader className={styles.cardHeader()}>
              <span className={styles.cardIcon()}>
                <KeyRound aria-hidden="true" />
              </span>
              <CardTitle className={styles.cardTitle()}>Permissões</CardTitle>
              <CardDescription className={styles.cardDescription()}>
                As permissões determinam os módulos e as ações disponíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className={styles.cardContent()}>
              <p className={styles.cardValue()}>{session.user.permissions.length}</p>
              <p className={styles.cardDetail()}>
                {session.user.permissions.length === 1
                  ? 'permissão ativa neste perfil'
                  : 'permissões ativas neste perfil'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </AuthenticatedShell>
  );
}
