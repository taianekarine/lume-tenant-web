import Link from 'next/link';

import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';

import {
  createTenantRoleAction,
  createTenantUserAction,
  deleteTenantRoleAction,
  setTenantUserActiveAction,
  updateTenantRoleAction,
  updateTenantUserAction,
} from '../actions';
import {
  TENANT_DEPARTMENTS,
  TENANT_DEPARTMENT_LABELS,
  type LocalLicenseStatus,
  type PermissionCatalog,
  type TenantRole,
  type TenantUser,
  type TenantUserList,
} from '../domain';
import {
  administrationButton,
  administrationStatus,
  administrationStyles as styles,
} from './administration-page.styles';

interface FeedbackProps {
  readonly error?: string;
  readonly success?: string;
}

function Feedback({ error, success }: FeedbackProps) {
  const message = error ?? success;
  if (!message) return null;

  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`mb-6 rounded-xl px-4 py-3 text-sm font-semibold ${
        error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'
      }`}
    >
      {message}
    </p>
  );
}

function DepartmentFields({ selected = [] }: { readonly selected?: readonly string[] }) {
  return (
    <div className={styles.checkboxGrid}>
      {TENANT_DEPARTMENTS.map((department) => (
        <label key={department} className={styles.checkbox}>
          <input
            type="checkbox"
            name="departments"
            value={department}
            defaultChecked={selected.includes(department)}
          />
          {TENANT_DEPARTMENT_LABELS[department] ?? department}
        </label>
      ))}
    </div>
  );
}

function RoleFields({
  roles,
  selectedCodes = [],
}: {
  readonly roles: readonly TenantRole[];
  readonly selectedCodes?: readonly string[];
}) {
  return (
    <div className={styles.checkboxGrid}>
      {roles.map((role) => (
        <label key={role.id} className={styles.checkbox}>
          <input
            type="checkbox"
            name="roleIds"
            value={role.id}
            defaultChecked={selectedCodes.includes(role.code)}
          />
          <span>
            <strong className="block">{role.name}</strong>
            <small className="text-slate-500">{role.code}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

function PermissionFields({
  catalog,
  selected = [],
}: {
  readonly catalog: PermissionCatalog;
  readonly selected?: readonly string[];
}) {
  return (
    <div className="space-y-4">
      {catalog.resources.map((resource) => (
        <fieldset key={resource} className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-bold text-slate-900">{resource}</legend>
          <div className={styles.checkboxGrid}>
            {(catalog.actionsByResource[resource] ?? []).map((action) => {
              const permission = `${resource}:${action}`;
              return (
                <label key={permission} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission}
                    defaultChecked={selected.includes(permission)}
                  />
                  {action}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function UsersPage({
  session,
  users,
  roles,
  error,
  success,
}: {
  readonly session: AuthenticatedSession;
  readonly users: TenantUserList;
  readonly roles: readonly TenantRole[];
} & FeedbackProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Administração local</p>
            <h1 className={styles.title}>Usuários</h1>
            <p className={styles.description}>
              Contas deste cliente são criadas e mantidas somente no banco local do tenant.
            </p>
          </div>
        </header>
        <Feedback error={error} success={success} />

        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Usuários cadastrados</h2>
            <p className={styles.panelDescription}>{users.meta.total} conta(s) encontrada(s).</p>
            <div className={styles.list}>
              {users.data.length ? (
                users.data.map((user) => (
                  <article key={user.id} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <div>
                        <h3 className={styles.itemTitle}>{user.name}</h3>
                        <p className={styles.itemMeta}>
                          {user.username} · {user.email}
                        </p>
                      </div>
                      <span
                        className={administrationStatus({
                          state: user.isActive ? 'active' : 'inactive',
                        })}
                      >
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className={styles.chips}>
                      {user.departments.map((department) => (
                        <span key={department} className={styles.chip}>
                          {TENANT_DEPARTMENT_LABELS[department] ?? department}
                        </span>
                      ))}
                      {user.roles.map((role) => (
                        <span key={role} className={styles.chip}>
                          {role}
                        </span>
                      ))}
                    </div>
                    <div className={styles.actions}>
                      <Link
                        href={`/users/${user.id}`}
                        className={administrationButton({ variant: 'secondary' })}
                      >
                        Editar
                      </Link>
                      <form action={setTenantUserActiveAction.bind(null, user.id, !user.isActive)}>
                        <button
                          type="submit"
                          className={administrationButton({
                            variant: user.isActive ? 'danger' : 'primary',
                          })}
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </form>
                    </div>
                  </article>
                ))
              ) : (
                <p className={styles.empty}>Nenhum usuário cadastrado.</p>
              )}
            </div>
          </section>

          <aside className={styles.panel}>
            <h2 className={styles.panelTitle}>Novo usuário</h2>
            <p className={styles.panelDescription}>
              A senha inicial deve ter 12 caracteres, maiúscula, minúscula, número e símbolo.
            </p>
            <form action={createTenantUserAction} className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>Nome</span>
                <input name="name" required minLength={3} className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Usuário</span>
                <input name="username" required minLength={3} className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>E-mail</span>
                <input name="email" type="email" required className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>CPF (opcional)</span>
                <input name="cpf" inputMode="numeric" className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Senha inicial</span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  className={styles.input}
                />
              </label>
              <fieldset className={styles.field}>
                <legend className={styles.label}>Departamentos</legend>
                <DepartmentFields />
              </fieldset>
              <fieldset className={styles.field}>
                <legend className={styles.label}>Papéis</legend>
                <RoleFields roles={roles} />
              </fieldset>
              <button type="submit" className={administrationButton()}>
                Criar usuário
              </button>
            </form>
          </aside>
        </div>
      </main>
    </AuthenticatedShell>
  );
}

export function UserEditorPage({
  session,
  user,
  roles,
  error,
  success,
}: {
  readonly session: AuthenticatedSession;
  readonly user: TenantUser;
  readonly roles: readonly TenantRole[];
} & FeedbackProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content}>
        <Link href="/users" className={administrationButton({ variant: 'secondary' })}>
          Voltar para usuários
        </Link>
        <header className="my-8">
          <p className={styles.eyebrow}>Administração local</p>
          <h1 className={styles.title}>Editar {user.name}</h1>
        </header>
        <Feedback error={error} success={success} />
        <section className={styles.panel}>
          <form action={updateTenantUserAction.bind(null, user.id)} className={styles.form}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={styles.field}>
                <span className={styles.label}>Nome</span>
                <input name="name" defaultValue={user.name} required className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>E-mail</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  required
                  className={styles.input}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>CPF</span>
                <input name="cpf" defaultValue={user.cpf ?? ''} className={styles.input} />
              </label>
              <div className={styles.field}>
                <span className={styles.label}>Usuário</span>
                <p className="flex h-11 items-center rounded-xl bg-slate-100 px-3 text-sm">
                  {user.username}
                </p>
              </div>
            </div>
            <fieldset className={styles.field}>
              <legend className={styles.label}>Departamentos</legend>
              <DepartmentFields selected={user.departments} />
            </fieldset>
            <fieldset className={styles.field}>
              <legend className={styles.label}>Papéis</legend>
              <RoleFields roles={roles} selectedCodes={user.roles} />
            </fieldset>
            <button type="submit" className={administrationButton()}>
              Salvar alterações
            </button>
          </form>
        </section>
      </main>
    </AuthenticatedShell>
  );
}

export function RolesPage({
  session,
  roles,
  permissions,
  error,
  success,
}: {
  readonly session: AuthenticatedSession;
  readonly roles: readonly TenantRole[];
  readonly permissions: PermissionCatalog;
} & FeedbackProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Administração local</p>
            <h1 className={styles.title}>Papéis e permissões</h1>
            <p className={styles.description}>
              O catálogo vem do backend local. Papéis do sistema são protegidos contra alteração.
            </p>
          </div>
        </header>
        <Feedback error={error} success={success} />
        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Papéis cadastrados</h2>
            <div className={styles.list}>
              {roles.map((role) => (
                <article key={role.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <div>
                      <h3 className={styles.itemTitle}>{role.name}</h3>
                      <p className={styles.itemMeta}>{role.code}</p>
                    </div>
                    <span
                      className={administrationStatus({
                        state: role.isSystem ? 'warning' : 'active',
                      })}
                    >
                      {role.isSystem ? 'Sistema' : 'Personalizado'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {role.description ?? 'Sem descrição.'}
                  </p>
                  <p className={styles.itemMeta}>{role.permissions.length} permissão(ões)</p>
                  <div className={styles.actions}>
                    <Link
                      href={`/roles/${role.id}`}
                      className={administrationButton({ variant: 'secondary' })}
                    >
                      {role.isSystem ? 'Consultar' : 'Editar'}
                    </Link>
                    {!role.isSystem ? (
                      <form action={deleteTenantRoleAction.bind(null, role.id)}>
                        <button
                          type="submit"
                          className={administrationButton({ variant: 'danger' })}
                        >
                          Excluir
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <aside className={styles.panel}>
            <h2 className={styles.panelTitle}>Novo papel</h2>
            <form action={createTenantRoleAction} className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>Código</span>
                <input
                  name="code"
                  required
                  placeholder="supervisor-comercial"
                  className={styles.input}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Nome</span>
                <input name="name" required className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Descrição</span>
                <textarea name="description" className={styles.textarea} />
              </label>
              <PermissionFields catalog={permissions} />
              <button type="submit" className={administrationButton()}>
                Criar papel
              </button>
            </form>
          </aside>
        </div>
      </main>
    </AuthenticatedShell>
  );
}

export function RoleEditorPage({
  session,
  role,
  permissions,
  error,
  success,
}: {
  readonly session: AuthenticatedSession;
  readonly role: TenantRole;
  readonly permissions: PermissionCatalog;
} & FeedbackProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content}>
        <Link href="/roles" className={administrationButton({ variant: 'secondary' })}>
          Voltar para papéis
        </Link>
        <header className="my-8">
          <p className={styles.eyebrow}>Administração local</p>
          <h1 className={styles.title}>{role.name}</h1>
        </header>
        <Feedback error={error} success={success} />
        <section className={styles.panel}>
          <form action={updateTenantRoleAction.bind(null, role.id)} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Código</span>
              <input
                name="code"
                defaultValue={role.code}
                readOnly={role.isSystem}
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Nome</span>
              <input
                name="name"
                defaultValue={role.name}
                readOnly={role.isSystem}
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Descrição</span>
              <textarea
                name="description"
                defaultValue={role.description ?? ''}
                readOnly={role.isSystem}
                className={styles.textarea}
              />
            </label>
            <PermissionFields catalog={permissions} selected={role.permissions} />
            {!role.isSystem ? (
              <button type="submit" className={administrationButton()}>
                Salvar papel
              </button>
            ) : (
              <p className={styles.empty}>Papéis do sistema são somente leitura.</p>
            )}
          </form>
        </section>
      </main>
    </AuthenticatedShell>
  );
}

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
          <h2 className="mt-8 text-lg font-bold text-slate-950">Funcionalidades licenciadas</h2>
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
