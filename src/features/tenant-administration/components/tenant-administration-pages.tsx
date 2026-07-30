import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';

import type { LocalLicenseStatus } from '../domain';
import { administrationStatus, administrationStyles as styles } from './administration-page.styles';

export function LicensePage({
  session,
  license,
}: {
  readonly session: AuthenticatedSession;
  readonly license: LocalLicenseStatus;
}) {
  const state = license.state === 'active' ? 'active' : 'warning';
  const stateLabel = license.state === 'active' ? 'Ativa' : 'Em tolerância';

  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Instalação local</p>
            <h1 className={styles.title}>Licença</h1>
            <p className={styles.description}>
              Este estado é verificado localmente e não depende da disponibilidade do Lume Control.
            </p>
          </div>
          <span className={administrationStatus({ state })}>{stateLabel}</span>
        </header>
        <section className={styles.panel}>
          <div className={styles.definitionGrid}>
            {[
              ['Plano', license.plan],
              ['Tenant', license.tenantId],
              ['Instalação', license.installationId],
              ['Validade', new Date(license.expiresAt).toLocaleString('pt-BR')],
              ['Tolerância até', new Date(license.graceUntil).toLocaleString('pt-BR')],
            ].map(([label, value]) => (
              <div key={label} className={styles.definition}>
                <p className={styles.definitionLabel}>{label}</p>
                <p className={styles.definitionValue}>{value}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-8 text-lg font-bold text-foreground">Funcionalidades licenciadas</h2>
          <div className={styles.chips}>
            {license.features.map((feature) => (
              <span key={feature} className={styles.chip}>
                {feature}
              </span>
            ))}
          </div>
        </section>
      </main>
    </AuthenticatedShell>
  );
}
