'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Plus, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useTransition } from 'react';
import { useController, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';

import { updateTenantUserFormAction } from '@/features/tenant-administration/actions';
import {
  TENANT_DEPARTMENTS,
  TENANT_DEPARTMENT_LABELS,
  type PermissionCatalog,
  type TenantUser,
} from '@/features/tenant-administration/domain';
import {
  getPermissionCodeLabel,
  getPermissionResourceLabel,
} from '@/features/tenant-administration/permissions/permission-labels';
import { Button } from '@/shared/ui/button';
import { formatActionResultDescription } from '@/shared/lib/action-result-feedback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

import {
  compatiblePermissionCodes,
  groupPermissionsByResource,
  permissionResource,
} from './permission-assignment';
import { userEditorFormSchema, type UserEditorFormValues } from './user-form-schema';

function DepartmentCheckboxes({
  control,
  disabled,
}: {
  readonly control: Control<UserEditorFormValues>;
  readonly disabled: boolean;
}) {
  const { field } = useController({ control, name: 'departments' });

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {TENANT_DEPARTMENTS.map((department) => {
        const id = `edit-user-department-${department}`;
        return (
          <Field
            key={department}
            orientation="horizontal"
            className="rounded-lg border border-border p-3"
          >
            <Checkbox
              id={id}
              disabled={disabled}
              checked={field.value.includes(department)}
              onCheckedChange={(checked) =>
                field.onChange(
                  checked
                    ? [...field.value, department]
                    : field.value.filter((candidate) => candidate !== department),
                )
              }
            />
            <FieldLabel htmlFor={id}>{TENANT_DEPARTMENT_LABELS[department]}</FieldLabel>
          </Field>
        );
      })}
    </div>
  );
}

function PermissionCheckboxes({
  control,
  permissions,
  disabled,
}: {
  readonly control: Control<UserEditorFormValues>;
  readonly permissions: readonly string[];
  readonly disabled: boolean;
}) {
  const { field } = useController({ control, name: 'permissionCodes' });
  const groups = groupPermissionsByResource(permissions);

  if (permissions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        Selecione um departamento para consultar as permissões compatíveis.
      </p>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {[...groups].map(([resource, codes]) => {
        const resourceLabel = getPermissionResourceLabel(resource);
        const selectedCount = codes.filter((code) => field.value.includes(code)).length;
        const allSelected = selectedCount === codes.length;
        const partiallySelected = selectedCount > 0 && !allSelected;
        const selectAllId = `edit-user-permission-${resource}-all`;

        return (
          <section key={resource} className="rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h3 className="font-semibold">{resourceLabel}</h3>
            </div>
            <Field orientation="horizontal" className="mb-3 border-b pb-3">
              <Checkbox
                id={selectAllId}
                checked={allSelected}
                indeterminate={partiallySelected}
                disabled={disabled}
                aria-label={`Selecionar todas em ${resourceLabel}`}
                onCheckedChange={(checked) => {
                  const next = new Set(field.value);
                  codes.forEach((code) => {
                    if (checked) next.add(code);
                    else next.delete(code);
                  });
                  field.onChange([...next]);
                }}
              />
              <FieldLabel htmlFor={selectAllId}>
                Selecionar todas
                <span className="sr-only"> em {resourceLabel}</span>
              </FieldLabel>
            </Field>
            <div className="space-y-2">
              {codes.map((code) => {
                const action = code.slice(permissionResource(code).length + 1);
                const id = `edit-user-permission-${code}`;
                return (
                  <Field key={code} orientation="horizontal">
                    <Checkbox
                      id={id}
                      checked={field.value.includes(code)}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, code]
                            : field.value.filter((candidate) => candidate !== code),
                        )
                      }
                    />
                    <FieldLabel htmlFor={id}>{getPermissionCodeLabel(resource, action)}</FieldLabel>
                  </Field>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function UserEditorForm({
  user,
  permissionCatalog,
}: {
  readonly user: TenantUser;
  readonly permissionCatalog: PermissionCatalog;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UserEditorFormValues>({
    resolver: zodResolver(userEditorFormSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      isAdministrator: user.isAdministrator,
      documentAccessMode: user.documentAccessMode ?? 'standard',
      departments: [...user.departments],
      permissionCodes: [...user.permissionCodes],
      jobTitle: user.jobTitle ?? '',
      maritalStatus: user.maritalStatus ?? 'not-informed',
      militaryDocumentStatus: user.militaryDocumentStatus ?? 'pending-confirmation',
      dependents: (user.dependents ?? []).map((dependent) => ({ ...dependent })),
    },
  });
  const dependents = useFieldArray({ control: form.control, name: 'dependents' });
  const isAdministrator = user.isAdministrator;
  const departments = useWatch({ control: form.control, name: 'departments' });
  const standardPermissions = useMemo(
    () => compatiblePermissionCodes(permissionCatalog, departments),
    [departments, permissionCatalog],
  );
  const visiblePermissions = isAdministrator ? permissionCatalog.permissions : standardPermissions;

  useEffect(() => {
    if (isAdministrator) {
      const currentDepartments = form.getValues('departments');
      const currentPermissions = form.getValues('permissionCodes');
      if (
        currentDepartments.length !== TENANT_DEPARTMENTS.length ||
        TENANT_DEPARTMENTS.some((department) => !currentDepartments.includes(department))
      ) {
        form.setValue('departments', [...TENANT_DEPARTMENTS]);
      }
      if (
        currentPermissions.length !== permissionCatalog.permissions.length ||
        permissionCatalog.permissions.some((permission) => !currentPermissions.includes(permission))
      ) {
        form.setValue('permissionCodes', [...permissionCatalog.permissions]);
      }
      return;
    }

    const allowed = new Set(standardPermissions);
    const current = form.getValues('permissionCodes');
    const filtered = current.filter((permission) => allowed.has(permission));
    if (current.length !== filtered.length) {
      form.setValue('permissionCodes', filtered, { shouldValidate: true });
    }
  }, [form, isAdministrator, permissionCatalog.permissions, standardPermissions]);

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const supportsEmployeeProfile =
        user.jobTitle !== undefined ||
        user.maritalStatus !== undefined ||
        user.militaryDocumentStatus !== undefined ||
        user.dependents !== undefined;
      const result = await updateTenantUserFormAction(
        user.id,
        supportsEmployeeProfile
          ? values
          : Object.fromEntries(
              Object.entries(values).filter(
                ([key]) =>
                  !['jobTitle', 'maritalStatus', 'militaryDocumentStatus', 'dependents'].includes(
                    key,
                  ),
              ),
            ),
      );
      toast.add({
        title: result.success ? 'Usuário atualizado' : 'Alteração não concluída',
        description: formatActionResultDescription(result),
        type: result.success ? 'success' : 'error',
      });
    });
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Dados e acessos do usuário</CardTitle>
        <CardDescription>
          Os departamentos definem quais permissões individuais podem ser concedidas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="edit-user-name">Nome</FieldLabel>
              <Input id="edit-user-name" className="h-11" {...form.register('name')} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="edit-user-email">E-mail</FieldLabel>
              <Input
                id="edit-user-email"
                type="email"
                className="h-11"
                {...form.register('email')}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-user-username">Usuário</FieldLabel>
              <Input
                id="edit-user-username"
                value={user.username}
                className="h-11"
                disabled
                readOnly
              />
              <FieldDescription>O identificador de acesso não é alterado.</FieldDescription>
            </Field>
          </div>

          <FieldSet>
            <FieldLegend>Perfil para documentação</FieldLegend>
            <FieldDescription>
              Estes dados determinam as exigências aplicáveis. Alterações não apagam arquivos já
              enviados.
            </FieldDescription>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="edit-user-job-title">Cargo ou função</FieldLabel>
                <Input id="edit-user-job-title" {...form.register('jobTitle')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-user-marital-status">Situação civil</FieldLabel>
                <select
                  id="edit-user-marital-status"
                  className="h-9 rounded-lg border bg-background px-3"
                  {...form.register('maritalStatus')}
                >
                  <option value="not-informed">Não informada</option>
                  <option value="single">Solteiro(a)</option>
                  <option value="married">Casado(a)</option>
                  <option value="stable-union">União estável</option>
                  <option value="divorced">Divorciado(a)</option>
                  <option value="widowed">Viúvo(a)</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-user-military-status">Documentação militar</FieldLabel>
                <select
                  id="edit-user-military-status"
                  className="h-9 rounded-lg border bg-background px-3"
                  {...form.register('militaryDocumentStatus')}
                >
                  <option value="pending-confirmation">Pendente de confirmação</option>
                  <option value="applicable">Aplicável</option>
                  <option value="not-applicable">Não aplicável</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Filhos e dependentes</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  dependents.append({ name: '', birthDate: '', relationship: 'filho(a)' })
                }
              >
                <Plus className="size-4" /> Adicionar dependente
              </Button>
            </div>
            <div className="space-y-3">
              {dependents.fields.map((dependent, index) => (
                <div
                  key={dependent.id}
                  className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_11rem_10rem_auto]"
                >
                  <Input
                    aria-label={`Nome do dependente ${index + 1}`}
                    placeholder="Nome completo"
                    {...form.register(`dependents.${index}.name`)}
                  />
                  <Input
                    aria-label={`Nascimento do dependente ${index + 1}`}
                    type="date"
                    {...form.register(`dependents.${index}.birthDate`)}
                  />
                  <Input
                    aria-label={`Vínculo do dependente ${index + 1}`}
                    placeholder="Vínculo"
                    {...form.register(`dependents.${index}.relationship`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover dependente ${index + 1}`}
                    onClick={() => dependents.remove(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </FieldSet>

          {isAdministrator ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="font-medium">Conta administradora</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Este vínculo foi provisionado fora do Tenant Web e não pode ser concedido, removido
                ou transferido por esta interface.
              </p>
            </div>
          ) : null}

          <FieldSet>
            <FieldLegend>Departamentos</FieldLegend>
            <FieldDescription>
              {isAdministrator
                ? 'Todos os departamentos estão incluídos automaticamente.'
                : 'O usuário deve permanecer vinculado a ao menos um departamento.'}
            </FieldDescription>
            <DepartmentCheckboxes control={form.control} disabled={isAdministrator} />
            <FieldError errors={[form.formState.errors.departments]} />
          </FieldSet>

          <FieldSet>
            <FieldLegend>Permissões individuais</FieldLegend>
            <FieldDescription>
              {isAdministrator
                ? 'Todas as permissões atuais e futuras são concedidas automaticamente.'
                : 'Ao remover um departamento, permissões fora do novo limite também são removidas.'}
            </FieldDescription>
            {!isAdministrator ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Dashboard, Agentes de IA, Perfil e Suporte são acessos comuns automáticos e não
                fazem parte da seleção individual.
              </p>
            ) : null}
            <PermissionCheckboxes
              control={form.control}
              permissions={visiblePermissions}
              disabled={isAdministrator}
            />
            <FieldError errors={[form.formState.errors.permissionCodes]} />
          </FieldSet>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
            <Button
              render={<Link href="/users" />}
              nativeButton={false}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircle className="animate-spin" /> : null}
              Salvar alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
