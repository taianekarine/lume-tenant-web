import Link from 'next/link';

import { reviewDocumentSubmissionAction, uploadDocumentSubmissionAction } from '../actions';
import type { DocumentRequestDetail } from '../domain';
import { DOCUMENT_CONTEXT_LABELS, DOCUMENT_STATUS_LABELS } from '../domain';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

function latestReason(item: DocumentRequestDetail['items'][number]): string | null {
  return item.submissions[0]?.reviews[0]?.reason ?? null;
}

export function DocumentRequestWorkspace({
  request,
  canReview,
  returnPath,
}: {
  readonly request: DocumentRequestDetail;
  readonly canReview: boolean;
  readonly returnPath: string;
}) {
  const approved = request.items.filter((item) => item.status === 'approved').length;
  const progress = request.items.length ? Math.round((approved / request.items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">
          {DOCUMENT_CONTEXT_LABELS[request.context]}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{request.checklist.name}</h1>
            <p className="text-sm text-muted-foreground">
              Titular: {request.subject.name} · {DOCUMENT_STATUS_LABELS[request.status]}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {progress}% concluído
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="space-y-4">
        {request.items.map((item) => {
          const latest = item.submissions[0];
          const canUpload = [
            'pending-upload',
            'resubmission-required',
            'rejected',
            'expired',
          ].includes(item.status);
          const requiresFrontBack = item.config.requiresFrontBack === true;
          const requiresOriginal = item.config.requiresOriginal === true;
          const accepts = Array.isArray(item.config.acceptedMimeTypes)
            ? item.config.acceptedMimeTypes.filter(
                (entry): entry is string => typeof entry === 'string',
              )
            : ['application/pdf', 'image/jpeg', 'image/png'];
          const uploadAction = uploadDocumentSubmissionAction.bind(
            null,
            request.id,
            item.id,
            returnPath,
          );

          return (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {item.position}. {item.documentType.name}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                    {DOCUMENT_STATUS_LABELS[item.status]}
                  </span>
                </CardTitle>
                <CardDescription>
                  {item.requirement === 'required'
                    ? 'Obrigatório'
                    : item.requirement === 'optional'
                      ? 'Opcional'
                      : 'Condicional'}
                  {item.instructions ? ` · ${item.instructions}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestReason(item) ? (
                  <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    Motivo: {latestReason(item)}
                  </p>
                ) : null}

                {latest ? (
                  <div className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-semibold">Envio v{latest.version}</p>
                    <div className="flex flex-wrap gap-2">
                      {latest.files.map((file) => (
                        <Link
                          key={file.id}
                          href={`/documents/files/${file.id}`}
                          target="_blank"
                          className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          {file.fileName} · {file.side}
                        </Link>
                      ))}
                    </div>
                    {latest.validation ? (
                      <div className="rounded-md bg-muted/60 p-3 text-xs">
                        <p className="font-semibold">Pré-validação</p>
                        <p>{latest.validation.summary}</p>
                        {latest.validation.alerts.map((alert, index) => (
                          <p key={index} className="mt-1 text-amber-700">
                            {String(alert)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {canUpload ? (
                  <form
                    action={uploadAction}
                    className="space-y-3 rounded-lg border border-dashed p-4"
                  >
                    <label className="block text-sm font-medium" htmlFor={`files-${item.id}`}>
                      {requiresFrontBack
                        ? 'Selecione frente e verso, nesta ordem'
                        : 'Selecione o arquivo ou as páginas'}
                    </label>
                    <Input
                      id={`files-${item.id}`}
                      name="files"
                      type="file"
                      accept={accepts.join(',')}
                      multiple={requiresFrontBack || item.config.allowsMultiplePages === true}
                      required
                    />
                    <input
                      type="hidden"
                      name="sides"
                      value={requiresFrontBack ? 'front,back' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos: PDF, JPEG ou PNG. Os limites configurados serão validados pela API.
                    </p>
                    <Button type="submit">Enviar documento</Button>
                  </form>
                ) : null}

                {canReview && latest?.status === 'pending-human-review' ? (
                  <form
                    action={reviewDocumentSubmissionAction.bind(
                      null,
                      request.id,
                      latest.id,
                      returnPath,
                    )}
                    className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
                  >
                    <label className="space-y-1 text-sm font-medium">
                      <span>Decisão</span>
                      <select
                        name="decision"
                        className="h-9 w-full rounded-lg border bg-background px-3"
                      >
                        <option value="approved">Aprovar</option>
                        <option value="resubmission-required">Solicitar reenvio</option>
                        <option value="rejected">Recusar</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm font-medium">
                      <span>Validade</span>
                      <Input name="validUntil" type="date" />
                    </label>
                    <label className="space-y-1 text-sm font-medium md:col-span-2">
                      <span>Motivo da recusa/reenvio</span>
                      <Input name="reason" maxLength={1000} />
                    </label>
                    <label className="space-y-1 text-sm font-medium">
                      <span>Conferência do original</span>
                      <select
                        name="originalCheckStatus"
                        defaultValue={requiresOriginal ? 'pending' : 'not-required'}
                        className="h-9 w-full rounded-lg border bg-background px-3"
                      >
                        <option value="not-required">Não exigido</option>
                        <option value="pending">Pendente</option>
                        <option value="confirmed">Original conferido</option>
                        <option value="divergent">Divergência encontrada</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm font-medium">
                      <span>Observação do original</span>
                      <Input name="originalObservation" maxLength={1000} />
                    </label>
                    <label className="space-y-1 text-sm font-medium md:col-span-2">
                      <span>Observações internas</span>
                      <Textarea name="notes" maxLength={2000} />
                    </label>
                    <div className="md:col-span-2">
                      <Button type="submit">Registrar revisão humana</Button>
                    </div>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
