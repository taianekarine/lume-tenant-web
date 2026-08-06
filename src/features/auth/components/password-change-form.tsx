'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

import { completePasswordChangeAction } from '../actions/login-action';
import { AUTH_FALLBACK_ERROR_CODES } from '../lib/auth-error-feedback';
import { passwordChangeSchema, type PasswordChangeFormData } from '../lib/password-change-schema';

export function PasswordChangeForm({
  token,
  title = 'Crie sua nova senha',
}: {
  readonly token: string;
  readonly title?: string;
}) {
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
    errorCode?: string;
  } | null>(null);
  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { newPassword: '', confirmation: '' },
  });

  useEffect(() => {
    if (!feedback || feedback.success) return;
    toast.add({ title: 'Senha não alterada', description: feedback.message, type: 'error' });
  }, [feedback]);

  const submit = form.handleSubmit(
    async (values) => {
      setFeedback(null);
      const result = await completePasswordChangeAction({
        token,
        newPassword: values.newPassword,
      });
      setFeedback(result);
      if (result.success) form.reset();
    },
    () => {
      setFeedback({
        success: false,
        message: 'Revise os campos destacados e tente novamente.',
        errorCode: AUTH_FALLBACK_ERROR_CODES.validation,
      });
    },
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você ainda não está autenticado. A senha inicial não concede acesso à plataforma; defina
          uma senha inédita para continuar.
        </p>
      </div>
      {feedback?.success ? (
        <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success-emphasis">
          {feedback.message}
        </p>
      ) : null}
      {feedback?.success ? (
        <Button render={<Link href="/login" />} nativeButton={false} className="w-full" size="lg">
          Ir para o login
        </Button>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field data-invalid={Boolean(form.formState.errors.newPassword)}>
            <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="h-11"
              {...form.register('newPassword')}
              aria-invalid={Boolean(form.formState.errors.newPassword)}
            />
            <FieldDescription>
              Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.newPassword]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.confirmation)}>
            <FieldLabel htmlFor="password-confirmation">Confirmar nova senha</FieldLabel>
            <Input
              id="password-confirmation"
              type="password"
              autoComplete="new-password"
              className="h-11"
              {...form.register('confirmation')}
              aria-invalid={Boolean(form.formState.errors.confirmation)}
            />
            <FieldError errors={[form.formState.errors.confirmation]} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : 'Criar nova senha'}
          </Button>
        </form>
      )}
    </div>
  );
}
