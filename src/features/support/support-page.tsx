'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ExternalLink, LoaderCircle, Send } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

import { submitSupportRequestAction } from './support-actions';
import { supportFormSchema, type SupportFormData } from './support-schema';

const SUPPORT_TO = 'devops@mileniumturismo.com.br';
const SUPPORT_CC = ['taiane.karine@mileniumturismo.com.br', 'taianekas.dev@outlook.com'].join(',');

export interface SupportRequester {
  readonly name: string;
  readonly username: string;
  readonly email: string;
}

export function buildSupportMailtoUrl(
  values: SupportFormData,
  requester: SupportRequester,
): string {
  const body = [
    values.message.trim(),
    '',
    'Dados do solicitante',
    `Nome: ${requester.name}`,
    `Usuário: ${requester.username}`,
    `E-mail: ${requester.email}`,
  ].join('\r\n');

  return [
    `mailto:${SUPPORT_TO}`,
    `?cc=${encodeURIComponent(SUPPORT_CC)}`,
    `&subject=${encodeURIComponent(`[Lume] ${values.subject.trim()}`)}`,
    `&body=${encodeURIComponent(body)}`,
  ].join('');
}

export function SupportPage({ requester }: { readonly requester: SupportRequester }) {
  const [providerError, setProviderError] = React.useState<{
    readonly message: string;
    readonly fallbackAllowed: boolean;
  } | null>(null);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<SupportFormData>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: { subject: '', message: '' },
  });

  const submit = form.handleSubmit((values) => {
    setProviderError(null);
    setSuccessMessage('');
    startTransition(async () => {
      const result = await submitSupportRequestAction(values);
      if (!result.success) {
        setProviderError({
          message: result.message,
          fallbackAllowed: result.fallbackAllowed,
        });
        return;
      }
      form.reset();
      setSuccessMessage(`Solicitação enviada com sucesso. Protocolo: ${result.requestId}`);
    });
  });

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Abrir Ticket por e-mail</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Descreva sua solicitação. O Lume enviará a mensagem com seus dados de identificação pelo
          provedor de e-mail configurado.
        </p>
      </div>
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-5" noValidate>
            <Field data-invalid={Boolean(form.formState.errors.subject)}>
              <FieldLabel htmlFor="support-subject">Assunto</FieldLabel>
              <Input
                id="support-subject"
                className="h-11"
                {...form.register('subject')}
                aria-invalid={Boolean(form.formState.errors.subject)}
              />
              <FieldError errors={[form.formState.errors.subject]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.message)}>
              <FieldLabel htmlFor="support-message">Mensagem</FieldLabel>
              <Textarea
                id="support-message"
                className="min-h-52"
                {...form.register('message')}
                aria-invalid={Boolean(form.formState.errors.message)}
              />
              <FieldDescription>Não inclua senhas, tokens ou outras credenciais.</FieldDescription>
              <FieldError errors={[form.formState.errors.message]} />
            </Field>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
              {isPending ? 'Enviando...' : 'Enviar solicitação'}
            </Button>

            {successMessage ? (
              <p
                role="status"
                className="text-sm font-medium text-emerald-700 dark:text-emerald-300"
              >
                {successMessage}
              </p>
            ) : null}

            {providerError ? (
              <div
                role="alert"
                className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
              >
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {providerError.message}
                    {providerError.fallbackAllowed
                      ? ' Como alternativa, abra o aplicativo de e-mail com destinatários, assunto, mensagem e seus dados já preenchidos.'
                      : ''}
                  </span>
                </p>
                {providerError.fallbackAllowed ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      window.location.assign(buildSupportMailtoUrl(form.getValues(), requester))
                    }
                  >
                    <ExternalLink />
                    Abrir no aplicativo de e-mail
                  </Button>
                ) : null}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </>
  );
}
