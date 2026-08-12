'use client';

import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { Camera, FileUp, LoaderCircle } from 'lucide-react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';

import { buildDocumentUploadFormData } from '../actions/document-upload-form-data';
import { Button, buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

function SubmitButton({
  enabled,
  replace,
  pending,
}: {
  readonly enabled: boolean;
  readonly replace: boolean;
  readonly pending: boolean;
}) {
  return (
    <Button type="submit" disabled={!enabled || pending} variant="outline">
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {pending ? 'Enviando...' : replace ? 'Substituir arquivo enviado' : 'Enviar documento'}
    </Button>
  );
}

function selectedFiles(input: HTMLInputElement): File[] {
  return Array.from(input.files ?? []);
}

function FileSlot({
  id,
  name,
  label,
  accept,
  multiple,
  onFilesChange,
}: {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly accept: string;
  readonly multiple: boolean;
  readonly onFilesChange: (files: readonly File[]) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<readonly string[]>([]);

  const update = (selected: HTMLInputElement, alternate: RefObject<HTMLInputElement | null>) => {
    if (alternate.current) alternate.current.value = '';
    const next = selectedFiles(selected);
    setNames(next.map((file) => file.name));
    onFilesChange(next);
  };

  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <label
          htmlFor={`${id}-picker`}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'w-full cursor-pointer shadow-sm sm:w-auto',
          )}
        >
          <FileUp aria-hidden="true" />
          Selecionar arquivo
        </label>
        <label
          htmlFor={`${id}-camera`}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'w-full cursor-pointer sm:w-auto',
          )}
        >
          <Camera aria-hidden="true" />
          Usar câmera
        </label>
        <input
          ref={pickerRef}
          id={`${id}-picker`}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(event) => update(event.currentTarget, cameraRef)}
        />
        <input
          ref={cameraRef}
          id={`${id}-camera`}
          name={name}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => update(event.currentTarget, pickerRef)}
        />
      </div>
      <p className="mt-2 min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {names.length > 0 ? names.join(', ') : 'Nenhum arquivo selecionado.'}
      </p>
    </div>
  );
}

export function DocumentUploadForm({
  uploadUrl,
  itemId,
  accepts,
  requiresFrontBack,
  repeatableByDependent,
  allowsMultiplePages,
  replace,
  initiallyExpanded = false,
  successUrl,
}: {
  readonly uploadUrl: string;
  readonly itemId: string;
  readonly accepts: readonly string[];
  readonly requiresFrontBack: boolean;
  readonly repeatableByDependent: boolean;
  readonly allowsMultiplePages: boolean;
  readonly replace: boolean;
  readonly initiallyExpanded?: boolean;
  readonly successUrl?: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [pending, setPending] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [feedback, setFeedback] = useState<{
    readonly kind: 'error' | 'success';
    readonly message: string;
  } | null>(null);
  const [singleFiles, setSingleFiles] = useState<readonly File[]>([]);
  const [frontFiles, setFrontFiles] = useState<readonly File[]>([]);
  const [backFiles, setBackFiles] = useState<readonly File[]>([]);
  const frontBackReady =
    frontFiles.length > 0 && backFiles.length > 0 && frontFiles.length === backFiles.length;
  const ready = requiresFrontBack ? frontBackReady : singleFiles.length > 0;
  const accept = accepts.join(',');

  const activate = () => {
    flushSync(() => setExpanded(true));
    if (!requiresFrontBack) document.getElementById(`${itemId}-single-picker`)?.click();
  };

  const clearSelection = () => {
    setSingleFiles([]);
    setFrontFiles([]);
    setBackFiles([]);
    setResetVersion((version) => version + 1);
  };

  const cancel = () => {
    clearSelection();
    setFeedback(null);
    setExpanded(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFeedback(null);
    const source = new FormData();
    source.set('requiresFrontBack', requiresFrontBack ? 'true' : 'false');
    if (requiresFrontBack) {
      for (const file of frontFiles) source.append('frontFiles', file);
      for (const file of backFiles) source.append('backFiles', file);
    } else {
      for (const file of singleFiles) source.append('files', file);
    }
    const commandId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const upload = buildDocumentUploadFormData(source, commandId);
    const files = upload
      .getAll('files')
      .filter((entry): entry is File => typeof entry !== 'string' && entry.size > 0);

    if (files.length === 0) {
      setFeedback({ kind: 'error', message: 'Selecione ao menos um arquivo.' });
      return;
    }
    setPending(true);
    try {
      const response = await fetch(uploadUrl, { method: 'POST', body: upload });
      if (!response.ok) {
        let message = 'Não foi possível enviar o documento. Tente novamente.';
        try {
          const body = (await response.json()) as { message?: string | string[] };
          if (typeof body.message === 'string') message = body.message;
          else if (Array.isArray(body.message)) message = body.message.join(' ');
        } catch {
          // Mantém uma mensagem acionável quando o proxy responde sem JSON.
        }
        setFeedback({ kind: 'error', message });
        return;
      }

      form.reset();
      clearSelection();
      if (successUrl) {
        router.replace(successUrl);
      } else {
        setFeedback({ kind: 'success', message: 'Documento enviado para revisão.' });
        router.refresh();
      }
    } catch {
      setFeedback({
        kind: 'error',
        message: 'A conexão foi interrompida. Verifique sua internet e tente novamente.',
      });
    } finally {
      setPending(false);
    }
  };

  if (!expanded) {
    return (
      <div className="rounded-xl border border-dashed p-3 sm:p-4">
        <Button type="button" variant="outline" onClick={activate}>
          <FileUp aria-hidden="true" />
          {requiresFrontBack ? 'Adicionar frente e verso' : 'Selecionar arquivo'}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Escolha este documento para adicionar o arquivo.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="min-w-0 space-y-3 rounded-xl border border-dashed p-3 sm:p-4"
    >
      {requiresFrontBack ? (
        <div className="grid gap-3 md:grid-cols-2">
          <FileSlot
            key={`front-${resetVersion}`}
            id={`${itemId}-front`}
            name="frontFiles"
            label="Frente"
            accept={accept}
            multiple={repeatableByDependent}
            onFilesChange={setFrontFiles}
          />
          <FileSlot
            key={`back-${resetVersion}`}
            id={`${itemId}-back`}
            name="backFiles"
            label="Verso"
            accept={accept}
            multiple={repeatableByDependent}
            onFilesChange={setBackFiles}
          />
        </div>
      ) : (
        <FileSlot
          key={`single-${resetVersion}`}
          id={`${itemId}-single`}
          name="files"
          label={repeatableByDependent ? 'Arquivos dos dependentes' : 'Documento'}
          accept={accept}
          multiple={repeatableByDependent || allowsMultiplePages}
          onFilesChange={setSingleFiles}
        />
      )}
      <input type="hidden" name="requiresFrontBack" value={requiresFrontBack ? 'true' : 'false'} />
      <p className="text-xs text-muted-foreground">
        {repeatableByDependent
          ? requiresFrontBack
            ? 'Selecione a mesma quantidade de frentes e versos, na ordem dos dependentes. '
            : 'Você pode selecionar os documentos de mais de um dependente. '
          : ''}
        Formatos aceitos: PDF, JPEG ou PNG.
      </p>
      {requiresFrontBack && (frontFiles.length > 0 || backFiles.length > 0) && !frontBackReady ? (
        <p className="text-xs font-medium text-destructive-emphasis" role="alert">
          Selecione a frente e o verso de cada documento.
        </p>
      ) : null}
      {feedback ? (
        <p
          className={cn(
            'rounded-lg p-3 text-sm',
            feedback.kind === 'error'
              ? 'bg-destructive/10 text-destructive-emphasis'
              : 'bg-success/10 text-success-emphasis',
          )}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SubmitButton enabled={ready} replace={replace} pending={pending} />
        <Button type="button" variant="ghost" disabled={pending} onClick={cancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
