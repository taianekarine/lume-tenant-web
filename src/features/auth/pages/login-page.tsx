'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ThemeToggle } from '@/features/navigation/theme-toggle';
import { LumeBrand } from '@/shared/lume-brand';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

import { loginAction, type LoginActionFailure } from '../actions/login-action';
import type { PasswordSetupChallenge } from '../application';
import { InitialPasswordSetupDialog } from '../components/initial-password-setup-dialog';
import { AUTH_FALLBACK_ERROR_CODES } from '../lib/auth-error-feedback';
import { normalizeLoginIdentifier } from '../lib/login-identifier';
import { loginSchema, type LoginFormData } from '../lib/login-schema';
import { loginPageStyles } from './login-page.styles';

export function LoginPage({ passwordChanged = false }: { readonly passwordChanged?: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<LoginActionFailure | null>(null);
  const [passwordSetupChallenge, setPasswordSetupChallenge] =
    useState<PasswordSetupChallenge | null>(null);

  const {
    control,
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

  useEffect(() => {
    if (!loginError) return;
    toast.add({ title: 'Acesso não concluído', description: loginError.message, type: 'error' });
  }, [loginError]);

  async function handleLogin(values: LoginFormData) {
    setLoginError(null);

    const normalizedIdentifier = normalizeLoginIdentifier(values.identifier);

    try {
      const result = await loginAction({
        identifier: normalizedIdentifier.value,
        password: values.password,
        remember: values.remember,
      });

      if (result.success) {
        router.replace(result.destination);
        router.refresh();
        return;
      }

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
          <LumeBrand priority className={loginPageStyles.brand()} />
          <p className={loginPageStyles.platformName()}>Portal seguro</p>

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
              className="mb-5 rounded-lg bg-success/10 p-3 text-sm text-success-emphasis"
            >
              Senha definida com sucesso. Entre com sua nova senha.
            </p>
          ) : null}
          <form
            className={loginPageStyles.form()}
            onSubmit={handleSubmit(handleLogin, handleInvalidLogin)}
            noValidate
          >
            <div className={loginPageStyles.fieldGroup()}>
              <label htmlFor="identifier" className={loginPageStyles.label()}>
                Usuário ou e-mail
              </label>

              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="Digite seu usuário ou e-mail"
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                className={loginPageStyles.input()}
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
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={loginPageStyles.input({ hasAction: true })}
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

            <Controller
              control={control}
              name="remember"
              render={({ field }) => (
                <label htmlFor="remember" className={loginPageStyles.rememberLabel()}>
                  <Checkbox
                    id="remember"
                    name={field.name}
                    checked={field.value}
                    onBlur={field.onBlur}
                    onCheckedChange={field.onChange}
                    ref={field.ref}
                  />
                  Lembrar-me neste dispositivo
                </label>
              )}
            />

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
