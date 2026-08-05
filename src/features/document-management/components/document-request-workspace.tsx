import Link from 'next/link';

import {
  addDocumentRequestItemAction,
  deleteDocumentSubmissionAction,
  reviewDocumentSubmissionAction,
  setDocumentRequestItemPolicyAction,
  uploadDocumentSubmissionAction,
} from '../actions';
import type { DocumentRequestDetail, DocumentTypeSummary } from '../domain';
import { DOCUMENT_CONTEXT_LABELS, DOCUMENT_STATUS_LABELS } from '../domain';
import { DocumentFilePreview } from './document-file-preview';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/accordion';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

function latestReason(item: DocumentRequestDetail['items'][number]): string | null {
  return item.submissions[0]?.reviews[0]?.reason ?? null;
}

interface ExtractionFieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly type?: string;
  readonly multiple: boolean;
}

function extractionFields(
  config: Readonly<Record<string, unknown>>,
): readonly ExtractionFieldDefinition[] {
  const schema = config.extractionSchema;
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return [];
  const definitions = (schema as Record<string, unknown>).fields;
  if (!Array.isArray(definitions)) return [];
  return definitions.flatMap((definition) => {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) return [];
    const record = definition as Record<string, unknown>;
    return typeof record.key === 'string' && typeof record.label === 'string'
      ? [
          {
            key: record.key,
            label: record.label,
            type: typeof record.type === 'string' ? record.type : undefined,
            multiple: record.multiple === true,
          },
        ]
      : [];
  });
}

function fieldRecordValue(data: Readonly<Record<string, unknown>>, key: string): string {
  const entry = data[key];
  if (entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry) {
    const value = (entry as Record<string, unknown>).value;
    if (Array.isArray(value)) return value.map(String).join('\n');
    return typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
  }
  if (Array.isArray(entry)) return entry.map(String).join('\n');
  return typeof entry === 'string' ? entry : entry == null ? '' : JSON.stringify(entry);
}

function fieldConfidence(data: Readonly<Record<string, unknown>>, key: string): string {
  const entry = data[key];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return '';
  const confidence = (entry as Record<string, unknown>).confidence;
  return typeof confidence === 'number' ? String(Math.round(confidence * 100)) : '';
}

export function DocumentRequestWorkspace({
  request,
  canReview,
  returnPath,
  documentTypes = [],
}: {
  readonly request: DocumentRequestDetail;
  readonly canReview: boolean;
  readonly returnPath: string;
  readonly documentTypes?: readonly DocumentTypeSummary[];
}) {
  const approved = request.items.filter((item) =>
    ['approved', 'waived'].includes(item.status),
  ).length;
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
          <div className="flex flex-wrap items-center gap-2">
            {canReview ? (
              <>
                <Button
                  render={
                    <Link href={`/document-management/users/${request.subject.id}/export.xlsx`} />
                  }
                  nativeButton={false}
                  variant="outline"
                >
                  Baixar dados XLSX
                </Button>
                <Button
                  render={
                    <Link href={`/document-management/users/${request.subject.id}/files.zip`} />
                  }
                  nativeButton={false}
                  variant="outline"
                >
                  Baixar todos os arquivos
                </Button>
              </>
            ) : null}
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {progress}% concluído
            </span>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {canReview ? (
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer font-semibold">Incluir documento manualmente</summary>
          <form
            action={addDocumentRequestItemAction.bind(null, request.id, returnPath)}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="space-y-1 text-sm font-medium">
              <span>Tipo de documento</span>
              <select
                name="documentTypeId"
                className="h-9 w-full rounded-lg border bg-background px-3"
                required
              >
                <option value="">Selecione</option>
                {documentTypes
                  .filter((type) => type.active)
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Exigência</span>
              <select
                name="requirement"
                className="h-9 w-full rounded-lg border bg-background px-3"
                defaultValue="required"
              >
                <option value="required">Obrigatório</option>
                <option value="optional">Opcional</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Prazo</span>
              <Input name="dueAt" type="date" />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Motivo da inclusão</span>
              <Input name="reason" minLength={3} maxLength={1000} required />
            </label>
            <label className="space-y-1 text-sm font-medium md:col-span-2">
              <span>Instruções</span>
              <Textarea name="instructions" maxLength={2000} />
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Incluir documento</Button>
            </div>
          </form>
        </details>
      ) : null}

      <div className="space-y-4">
        {[...request.items]
          .sort((left, right) => {
            const priority = (status: string) =>
              status === 'pending-upload'
                ? 0
                : status === 'pending-human-review'
                  ? 1
                  : status === 'approved'
                    ? 2
                    : 3;
            return priority(left.status) - priority(right.status) || left.position - right.position;
          })
          .map((item) => {
            const latest = item.submissions.find((submission) => submission.status !== 'cancelled');
            const canUpload = [
              'pending-upload',
              'pending-human-review',
              'resubmission-required',
              'rejected',
              'expired',
            ].includes(item.status);
            const requiresFrontBack = item.config.requiresFrontBack === true;
            const requiresOriginal = item.config.requiresOriginal === true;
            const repeatableByDependent = item.config.repeatableByDependent === true;
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
            const configuredExtractionFields = extractionFields(item.config);

            const itemCard = (
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
                  {canReview ? (
                    <form
                      action={setDocumentRequestItemPolicyAction.bind(
                        null,
                        request.id,
                        item.id,
                        returnPath,
                      )}
                      className="grid gap-2 rounded-lg border bg-muted/30 p-3 md:grid-cols-[12rem_1fr_auto]"
                    >
                      <select
                        name="policy"
                        className="h-9 rounded-lg border bg-background px-3 text-sm"
                        defaultValue={item.status === 'waived' ? 'waived' : item.requirement}
                      >
                        <option value="required">Obrigatório</option>
                        <option value="optional">Opcional</option>
                        <option value="waived">Dispensado</option>
                      </select>
                      <Input
                        name="reason"
                        placeholder="Motivo da alteração"
                        minLength={3}
                        maxLength={1000}
                        required
                      />
                      <Button type="submit" variant="outline">
                        Atualizar exigência
                      </Button>
                    </form>
                  ) : null}
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
                          <DocumentFilePreview
                            key={file.id}
                            fileId={file.id}
                            fileName={file.fileName}
                            side={file.side}
                          />
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
                        {repeatableByDependent && requiresFrontBack
                          ? 'Selecione frente e verso de cada filho, mantendo cada par em sequência'
                          : repeatableByDependent
                            ? 'Selecione os arquivos de todos os filhos'
                            : requiresFrontBack
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
                        name="requiresFrontBack"
                        value={requiresFrontBack ? 'true' : 'false'}
                      />
                      <p className="text-xs text-muted-foreground">
                        {repeatableByDependent
                          ? 'Você pode selecionar documentos de mais de um filho no mesmo envio. '
                          : ''}
                        Formatos: PDF, JPEG ou PNG. Os limites configurados serão validados pela
                        API.
                      </p>
                      <Button type="submit">
                        {item.status === 'pending-human-review'
                          ? 'Substituir arquivo enviado'
                          : 'Enviar documento'}
                      </Button>
                    </form>
                  ) : null}

                  {latest &&
                  (item.status === 'pending-human-review' ||
                    (canReview && item.status === 'approved')) ? (
                    <form
                      action={deleteDocumentSubmissionAction.bind(
                        null,
                        request.id,
                        latest.id,
                        returnPath,
                      )}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-destructive/30 p-3"
                    >
                      {item.status === 'approved' ? (
                        <label className="min-w-64 flex-1 space-y-1 text-sm font-medium">
                          <span>Motivo da exclusão do documento aprovado</span>
                          <Input name="reason" minLength={3} maxLength={1000} required />
                        </label>
                      ) : null}
                      <Button type="submit" variant="destructive">
                        Excluir arquivo atual
                      </Button>
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
                      {configuredExtractionFields.length ? (
                        <fieldset className="space-y-3 rounded-lg bg-muted/40 p-3 md:col-span-2">
                          <legend className="px-1 text-sm font-semibold">
                            Dados extraídos/propostos e confirmação
                          </legend>
                          <p className="text-xs text-muted-foreground">
                            Confira o documento. O valor confirmado só integra o cadastro após esta
                            revisão humana.
                          </p>
                          {configuredExtractionFields.map((field) => (
                            <div key={field.key} className="grid gap-2 md:grid-cols-[1fr_8rem_1fr]">
                              {field.multiple ? (
                                <input type="hidden" name="multipleField" value={field.key} />
                              ) : null}
                              <label className="space-y-1 text-xs font-medium">
                                <span>{field.label} — valor proposto</span>
                                {field.multiple ? (
                                  <Textarea
                                    name={`proposed.${field.key}`}
                                    rows={3}
                                    placeholder="Um valor por filho"
                                    defaultValue={fieldRecordValue(latest.extractedData, field.key)}
                                  />
                                ) : (
                                  <Input
                                    name={`proposed.${field.key}`}
                                    type={field.type === 'date' ? 'date' : 'text'}
                                    defaultValue={fieldRecordValue(latest.extractedData, field.key)}
                                  />
                                )}
                              </label>
                              <label className="space-y-1 text-xs font-medium">
                                <span>Confiança %</span>
                                <Input
                                  name={`confidence.${field.key}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  defaultValue={fieldConfidence(latest.extractedData, field.key)}
                                />
                              </label>
                              <label className="space-y-1 text-xs font-medium">
                                <span>{field.label} — valor confirmado</span>
                                {field.multiple ? (
                                  <Textarea
                                    name={`confirmed.${field.key}`}
                                    rows={3}
                                    placeholder="Um valor por filho"
                                    defaultValue={
                                      fieldRecordValue(latest.confirmedData, field.key) ||
                                      fieldRecordValue(latest.extractedData, field.key)
                                    }
                                  />
                                ) : (
                                  <Input
                                    name={`confirmed.${field.key}`}
                                    type={field.type === 'date' ? 'date' : 'text'}
                                    defaultValue={
                                      fieldRecordValue(latest.confirmedData, field.key) ||
                                      fieldRecordValue(latest.extractedData, field.key)
                                    }
                                  />
                                )}
                              </label>
                            </div>
                          ))}
                        </fieldset>
                      ) : null}
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
            return item.status === 'approved' ? (
              <Accordion key={item.id}>
                <AccordionItem value={item.id} className="rounded-xl border px-4">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center justify-between gap-3 pr-2">
                      <span>{item.documentType.name}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700">
                        Aprovado
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>{itemCard}</AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              itemCard
            );
          })}
      </div>
    </div>
  );
}
