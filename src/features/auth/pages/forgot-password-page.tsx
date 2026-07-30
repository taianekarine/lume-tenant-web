'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { tenantBranding } from '@/config/tenant-branding';
import { ThemeToggle } from '@/features/navigation/theme-toggle';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import {
  requestPasswordResetAction,
  type PasswordRecoveryActionResult,
} from '../actions/password-recovery-action';
import {
  passwordRecoverySchema,
  type PasswordRecoveryFormData,
} from '../lib/password-recovery-schema';
import { AUTH_FALLBACK_ERROR_CODES } from '../lib/auth-error-feedback';
import { loginPageStyles } from './login-page.styles';

export function ForgotPasswordPage() {
  const [feedback, setFeedback] = useState<PasswordRecoveryActionResult | null>(null);
  const form = useForm<PasswordRecoveryFormData>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: { identifier: '' },
  });

  const submit = form.handleSubmit(
    async (values) => {
      setFeedback(null);
      setFeedback(await requestPasswordResetAction(values));
    },
    () => {
      setFeedback({
        success: false,
        message: 'Revise o campo destacado e tente novamente.',
        errorCode: AUTH_FALLBACK_ERROR_CODES.validation,
      });
    },
  );

  return (
    <main className={loginPageStyles.page()}>
      <div className={loginPageStyles.themeToggle()}>
        <ThemeToggle />
      </div>
      <Card className={loginPageStyles.card()}>
        <CardHeader className={loginPageStyles.cardHeader()}>
          <p className={loginPageStyles.platformName()}>{tenantBranding.productName}</p>
          <CardTitle>
            <h1 className={loginPageStyles.title()}>Recupere sua senha</h1>
          </CardTitle>
          <CardDescription className={loginPageStyles.description()}>
            Informe seu usuário ou e-mail. Se houver uma conta ativa, enviaremos um link seguro.
          </CardDescription>
        </CardHeader>

        <CardContent className={loginPageStyles.cardContent()}>
          {feedback ? (
            <p
              role={feedback.success ? 'status' : 'alert'}
              className={
                feedback.success
                  ? 'rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700'
                  : 'rounded-lg bg-destructive/10 p-3 text-sm text-destructive'
              }
            >
              <span className="block">{feedback.message}</span>
              {!feedback.success ? (
                <span className="mt-1 block font-mono text-xs">
                  Código do erro: {feedback.errorCode}
                </span>
              ) : null}
            </p>
          ) : null}

          <form className="space-y-5" onSubmit={submit} noValidate>
            <Field data-invalid={Boolean(form.formState.errors.identifier)}>
              <FieldLabel htmlFor="recovery-identifier">Usuário ou e-mail</FieldLabel>
              <Input
                id="recovery-identifier"
                type="text"
                autoComplete="username"
                placeholder="Digite seu usuário ou e-mail"
                className="h-11"
                aria-invalid={Boolean(form.formState.errors.identifier)}
                {...form.register('identifier')}
              />
              <FieldError errors={[form.formState.errors.identifier]} />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting || feedback?.success}
            >
              {form.formState.isSubmitting ? 'Enviando...' : 'Enviar instruções'}
            </Button>

            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Voltar para o login
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
