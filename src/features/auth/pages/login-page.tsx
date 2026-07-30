'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { tenantBranding } from '@/config/tenant-branding';
import { ThemeToggle } from '@/features/navigation/theme-toggle';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

import { loginAction, type LoginActionFailure } from '../actions/login-action';
import type { PasswordSetupChallenge } from '../application';
import { InitialPasswordSetupDialog } from '../components/initial-password-setup-dialog';
import { AUTH_FALLBACK_ERROR_CODES } from '../lib/auth-error-feedback';
import { normalizeLoginIdentifier } from '../lib/login-identifier';
import { loginSchema, type LoginFormData } from '../lib/login-schema';
import { loginPageStyles } from './login-page.styles';

export function LoginPage({ passwordChanged = false }: { readonly passwordChanged?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<LoginActionFailure | null>(null);
  const [passwordSetupChallenge, setPasswordSetupChallenge] =
    useState<PasswordSetupChallenge | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      remember: false,
    },
  });

  async function handleLogin(values: LoginFormData) {
    setLoginError(null);

    const normalizedIdentifier = normalizeLoginIdentifier(values.identifier);

    try {
      const result = await loginAction({
        identifier: normalizedIdentifier.value,
        password: values.password,
        remember: values.remember,
      });

      const setupChallenge = result.passwordSetupChallenge ?? null;
      setPasswordSetupChallenge(setupChallenge);
      setLoginError(setupChallenge ? null : result);
    } catch {
      setLoginError({
        success: false,
        message: 'Não foi possível acessar sua conta. Tente novamente.',
        errorCode: AUTH_FALLBACK_ERROR_CODES.unexpected,
      });
    }
  }

  function handleInvalidLogin() {
    setLoginError({
      success: false,
      message: 'Revise os campos destacados e tente novamente.',
      errorCode: AUTH_FALLBACK_ERROR_CODES.validation,
    });
  }

  return (
    <main className={loginPageStyles.page()}>
      <div className={loginPageStyles.themeToggle()}>
        <ThemeToggle />
      </div>
      <Card className={loginPageStyles.card()}>
        <CardHeader className={loginPageStyles.cardHeader()}>
          <p className={loginPageStyles.platformName()}>{tenantBranding.productName}</p>

          <CardTitle>
            <h1 className={loginPageStyles.title()}>Acesse sua conta</h1>
          </CardTitle>

          <CardDescription className={loginPageStyles.description()}>
            Informe seu usuário ou e-mail para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent className={loginPageStyles.cardContent()}>
          {passwordChanged ? (
            <p
              role="status"
              className="mb-5 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700"
            >
              Senha definida com sucesso. Entre com sua nova senha.
            </p>
          ) : null}
          <form
            className={loginPageStyles.form()}
            onSubmit={handleSubmit(handleLogin, handleInvalidLogin)}
            aria-describedby={loginError ? 'login-error' : undefined}
            noValidate
          >
            <div className={loginPageStyles.fieldGroup()}>
              <label htmlFor="identifier" className={loginPageStyles.label()}>
                Usuário ou e-mail
              </label>

              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="Digite seu usuário ou e-mail"
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                className={loginPageStyles.input({
                  invalid: Boolean(errors.identifier),
                })}
                {...register('identifier')}
              />

              {errors.identifier && (
                <p id="identifier-error" role="alert" className={loginPageStyles.fieldError()}>
                  {errors.identifier.message}
                </p>
              )}
            </div>

            <div className={loginPageStyles.fieldGroup()}>
              <div className={loginPageStyles.passwordHeader()}>
                <label htmlFor="password" className={loginPageStyles.label()}>
                  Senha
                </label>

                <Button
                  render={<Link href="/forgot-password" />}
                  nativeButton={false}
                  variant="link"
                  className={loginPageStyles.forgotPassword()}
                >
                  Esqueci minha senha
                </Button>
              </div>

              <div className={loginPageStyles.passwordContainer()}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={loginPageStyles.input({
                    hasAction: true,
                    invalid: Boolean(errors.password),
                  })}
                  {...register('password')}
                />

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPassword((current) => !current)}
                  className={loginPageStyles.passwordAction()}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>

              {errors.password && (
                <p id="password-error" role="alert" className={loginPageStyles.fieldError()}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <label className={loginPageStyles.rememberLabel()}>
              <input
                type="checkbox"
                className={loginPageStyles.checkbox()}
                {...register('remember')}
              />
              Lembrar-me neste dispositivo
            </label>

            {loginError && (
              <p id="login-error" role="alert" className={loginPageStyles.fieldError()}>
                <span className="block">{loginError.message}</span>
                <span className="mt-1 block font-mono text-xs">
                  Código do erro: {loginError.errorCode}
                </span>
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className={loginPageStyles.submitButton()}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <InitialPasswordSetupDialog
        challenge={passwordSetupChallenge}
        onClear={() => setPasswordSetupChallenge(null)}
      />
    </main>
  );
}
