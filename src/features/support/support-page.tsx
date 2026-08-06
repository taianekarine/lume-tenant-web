'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, LoaderCircle, Send } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from '@/shared/ui/toast';
import { userFacingMessage } from '@/shared/lib/user-facing-message';

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

  React.useEffect(() => {
    if (!providerError) return;
    toast.add({
      title: 'Solicitação não enviada',
      description: userFacingMessage(
        providerError.message,
        'Não foi possível enviar a solicitação. Tente novamente.',
      ),
      type: 'error',
    });
  }, [providerError]);

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
      setSuccessMessage('Solicitação enviada com sucesso.');
    });
  });

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Solicitação de suporte</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Descreva sua solicitação. O Lume enviará a mensagem com seus dados de identificação.
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
              <p role="status" className="text-sm font-medium text-success-emphasis">
                {successMessage}
              </p>
            ) : null}

            {providerError ? (
              <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
                {providerError.fallbackAllowed ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Você também pode continuar pelo aplicativo de e-mail com os dados já
                      preenchidos.
                    </p>
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
                  </>
                ) : null}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </>
  );
}
