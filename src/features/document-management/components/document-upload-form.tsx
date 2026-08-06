'use client';

import { useRef, useState } from 'react';
import { Camera, FileUp, LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { Button, buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

type UploadAction = (formData: FormData) => void | Promise<void>;

function SubmitButton({
  enabled,
  replace,
}: {
  readonly enabled: boolean;
  readonly replace: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={!enabled || pending} variant="outline">
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {pending ? 'Enviando...' : replace ? 'Substituir arquivo enviado' : 'Enviar documento'}
    </Button>
  );
}

function selectedNames(input: HTMLInputElement): string[] {
  return Array.from(input.files ?? [], (file) => file.name);
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
  readonly onFilesChange: (files: readonly string[]) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<readonly string[]>([]);

  const update = (source: 'picker' | 'camera') => {
    const active = source === 'picker' ? pickerRef.current : cameraRef.current;
    const inactive = source === 'picker' ? cameraRef.current : pickerRef.current;
    if (!active) return;
    if (inactive) inactive.value = '';
    const next = selectedNames(active);
    setNames(next);
    onFilesChange(next);
  };

  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <label
          htmlFor={`${id}-picker`}
          className={cn(buttonVariants({ size: 'lg' }), 'cursor-pointer shadow-sm')}
        >
          <FileUp aria-hidden="true" />
          Selecionar arquivo
        </label>
        <input
          ref={pickerRef}
          id={`${id}-picker`}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={() => update('picker')}
        />
        <label
          htmlFor={`${id}-camera`}
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'cursor-pointer')}
        >
          <Camera aria-hidden="true" />
          Usar câmera
        </label>
        <input
          ref={cameraRef}
          id={`${id}-camera`}
          name={name}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={() => update('camera')}
        />
      </div>
      <p className="mt-2 min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {names.length > 0 ? names.join(', ') : 'Nenhum arquivo selecionado.'}
      </p>
    </div>
  );
}

export function DocumentUploadForm({
  action,
  itemId,
  accepts,
  requiresFrontBack,
  repeatableByDependent,
  allowsMultiplePages,
  replace,
}: {
  readonly action: UploadAction;
  readonly itemId: string;
  readonly accepts: readonly string[];
  readonly requiresFrontBack: boolean;
  readonly repeatableByDependent: boolean;
  readonly allowsMultiplePages: boolean;
  readonly replace: boolean;
}) {
  const [singleFiles, setSingleFiles] = useState<readonly string[]>([]);
  const [frontFiles, setFrontFiles] = useState<readonly string[]>([]);
  const [backFiles, setBackFiles] = useState<readonly string[]>([]);
  const frontBackReady =
    frontFiles.length > 0 && backFiles.length > 0 && frontFiles.length === backFiles.length;
  const ready = requiresFrontBack ? frontBackReady : singleFiles.length > 0;
  const accept = accepts.join(',');

  return (
    <form action={action} className="space-y-3 rounded-xl border border-dashed p-4">
      {requiresFrontBack ? (
        <div className="grid gap-3 md:grid-cols-2">
          <FileSlot
            id={`${itemId}-front`}
            name="frontFiles"
            label="Frente"
            accept={accept}
            multiple={repeatableByDependent}
            onFilesChange={setFrontFiles}
          />
          <FileSlot
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
      <SubmitButton enabled={ready} replace={replace} />
    </form>
  );
}
