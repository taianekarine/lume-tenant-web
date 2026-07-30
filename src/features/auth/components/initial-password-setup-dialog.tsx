'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { completePasswordChangeAction } from '../actions/login-action';
import type { PasswordSetupChallenge } from '../application';
import { AUTH_FALLBACK_ERROR_CODES } from '../lib/auth-error-feedback';
import { passwordChangeSchema, type PasswordChangeFormData } from '../lib/password-change-schema';

interface PasswordSetupFeedback {
  readonly message: string;
  readonly errorCode: string;
}

export function InitialPasswordSetupDialog({
  challenge,
  onClear,
}: {
  readonly challenge: PasswordSetupChallenge | null;
  readonly onClear: () => void;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<PasswordSetupFeedback | null>(null);
  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { newPassword: '', confirmation: '' },
  });

  function clearChallenge() {
    form.reset();
    setFeedback(null);
    onClear();
  }

  const submit = form.handleSubmit(
    async (values) => {
      if (!challenge) return;
      setFeedback(null);
      const result = await completePasswordChangeAction({
        token: challenge.token,
        newPassword: values.newPassword,
      });

      if (!result.success) {
        setFeedback({
          message: result.message,
          errorCode: result.errorCode,
        });
        return;
      }

      clearChallenge();
      router.replace('/login?passwordChanged=1');
      router.refresh();
    },
    () => {
      setFeedback({
        message: 'Revise os campos destacados e tente novamente.',
        errorCode: AUTH_FALLBACK_ERROR_CODES.validation,
      });
    },
  );

  return (
    <Dialog
      open={challenge !== null}
      onOpenChange={(open) => {
        if (!open) clearChallenge();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Defina sua nova senha</DialogTitle>
          <DialogDescription>
            A senha inicial não concede acesso. Crie uma senha pessoal para concluir seu primeiro
            acesso; depois, entre novamente.
          </DialogDescription>
        </DialogHeader>
        <p className="font-mono text-xs text-muted-foreground">
          Código do erro: ACCOUNT_PASSWORD_SETUP_REQUIRED
        </p>

        {challenge ? (
          <form id="initial-password-setup-form" onSubmit={submit} className="space-y-4" noValidate>
            {feedback ? (
              <div
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <span className="block">{feedback.message}</span>
                <span className="mt-1 block font-mono text-xs">
                  Código do erro: {feedback.errorCode}
                </span>
              </div>
            ) : null}

            <Field data-invalid={Boolean(form.formState.errors.newPassword)}>
              <FieldLabel htmlFor="initial-new-password">Nova senha</FieldLabel>
              <Input
                id="initial-new-password"
                type="password"
                autoComplete="new-password"
                {...form.register('newPassword')}
                aria-invalid={Boolean(form.formState.errors.newPassword)}
              />
              <FieldDescription>
                Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.newPassword]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.confirmation)}>
              <FieldLabel htmlFor="initial-password-confirmation">Confirmar nova senha</FieldLabel>
              <Input
                id="initial-password-confirmation"
                type="password"
                autoComplete="new-password"
                {...form.register('confirmation')}
                aria-invalid={Boolean(form.formState.errors.confirmation)}
              />
              <FieldError errors={[form.formState.errors.confirmation]} />
            </Field>

            <p className="text-xs text-muted-foreground">
              Este desafio é temporário e expira em{' '}
              {new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(challenge.expiresAt))}
              .
            </p>
          </form>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={clearChallenge}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="initial-password-setup-form"
            disabled={!challenge || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
            Criar senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
