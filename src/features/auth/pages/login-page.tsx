'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { tenantBranding } from '@/config/tenant-branding';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

import { loginAction } from '../actions/login-action';
import { normalizeLoginIdentifier } from '../lib/login-identifier';
import { loginSchema, type LoginFormData } from '../lib/login-schema';
import { loginPageStyles } from './login-page.styles';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

      setLoginError(result.message);
    } catch {
      setLoginError('Não foi possível acessar sua conta. Tente novamente.');
    }
  }

  return (
    <main className={loginPageStyles.page()}>
      <Card className={loginPageStyles.card()}>
        <CardHeader className={loginPageStyles.cardHeader()}>
          <p className={loginPageStyles.platformName()}>{tenantBranding.productName}</p>

          <CardTitle>
            <h1 className={loginPageStyles.title()}>Acesse sua conta</h1>
          </CardTitle>

          <CardDescription className={loginPageStyles.description()}>
            Informe seu usuário, e-mail ou CPF para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent className={loginPageStyles.cardContent()}>
          <form
            className={loginPageStyles.form()}
            onSubmit={handleSubmit(handleLogin)}
            aria-describedby={loginError ? 'login-error' : undefined}
            noValidate
          >
            <div className={loginPageStyles.fieldGroup()}>
              <label htmlFor="identifier" className={loginPageStyles.label()}>
                Usuário, e-mail ou CPF
              </label>

              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="Digite seu usuário, e-mail ou CPF"
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

                <Button type="button" variant="link" className={loginPageStyles.forgotPassword()}>
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
                {loginError}
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
    </main>
  );
}
