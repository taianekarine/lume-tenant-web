'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  LoaderCircle,
  Paperclip,
  Search,
  Upload,
} from 'lucide-react';
import { z } from 'zod';

import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Progress } from '@/shared/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { toast } from '@/shared/ui/toast';

import {
  buildPaginationItems,
  WHATSAPP_HISTORY_DEPARTMENTS,
  WHATSAPP_HISTORY_DEPARTMENT_LABELS,
  WHATSAPP_HISTORY_REVIEW_FILTER_LABELS,
  WHATSAPP_HISTORY_STATES,
  WHATSAPP_HISTORY_STATE_LABELS,
  type WhatsAppHistoryArchive,
  type WhatsAppHistoryDepartment,
  type WhatsAppHistoryImportBatch,
  type WhatsAppHistoryReviewFilter,
  type WhatsAppHistoryState,
  whatsAppHistoryChannelSchema,
  whatsAppHistoryImportBatchSchema,
} from '../domain';

const channelsSchema = z.array(whatsAppHistoryChannelSchema);
const PAGE_SIZE = 20;

function plural(value: number, singular: string, pluralForm: string): string {
  return `${value} ${value === 1 ? singular : pluralForm}`;
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === 'string' && body.message.trim() ? body.message : fallback;
  } catch {
    return fallback;
  }
}

async function parseBatch(response: Response): Promise<WhatsAppHistoryImportBatch> {
  if (!response.ok) {
    throw new Error(await responseMessage(response, 'Não foi possível processar a importação.'));
  }
  return whatsAppHistoryImportBatchSchema.parse(await response.json());
}

function localDateTimeValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface ArchiveReviewCardProps {
  readonly batchId: string;
  readonly archive: WhatsAppHistoryArchive;
  readonly onSaved: (batch: WhatsAppHistoryImportBatch) => void;
}

function ArchiveReviewCard({ batchId, archive, onSaved }: ArchiveReviewCardProps) {
  const [contactName, setContactName] = useState(archive.contactName ?? '');
  const [phoneE164, setPhoneE164] = useState(archive.phoneE164 ?? '');
  const [companySenderName, setCompanySenderName] = useState(archive.companySenderName ?? '');
  const [state, setState] = useState<WhatsAppHistoryState | ''>(archive.state ?? '');
  const [department, setDepartment] = useState<WhatsAppHistoryDepartment>(archive.departmentCode);
  const [ownerUsername, setOwnerUsername] = useState(archive.ownerUsername ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/whatsapp-history-import/batches/${batchId}/archives/${encodeURIComponent(archive.archiveId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactName,
            phoneE164,
            companySenderName,
            state,
            departmentCode: department,
            ownerUsername: state === 'human-active' ? ownerUsername : null,
          }),
        },
      );
      const updated = await parseBatch(response);
      onSaved(updated);
      toast.add({
        title: 'Conversa revisada',
        description: 'Os dados foram salvos neste lote.',
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Não foi possível salvar',
        description: error instanceof Error ? error.message : 'Revise os campos e tente novamente.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={archive.status === 'ready' ? 'ring-success/30' : undefined}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <FileArchive aria-hidden="true" className="size-4 text-primary-emphasis" />
          <span className="min-w-0 truncate">{archive.archiveName}</span>
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-1 text-xs font-semibold',
              archive.status === 'ready'
                ? 'bg-success/15 text-success-emphasis'
                : 'bg-warning/15 text-warning-emphasis',
            )}
          >
            {archive.status === 'ready' ? 'Revisado' : 'Revisão necessária'}
          </span>
        </CardTitle>
        <CardDescription>
          {plural(archive.messageCount, 'mensagem', 'mensagens')} ·{' '}
          {plural(archive.attachmentCount, 'anexo', 'anexos')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {archive.issues.length > 0 ? (
          <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning-emphasis">
            {archive.issues.join(' ')}
          </div>
        ) : null}
        {archive.missingAttachmentCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {plural(
              archive.missingAttachmentCount,
              'anexo citado não está no ZIP',
              'anexos citados não estão no ZIP',
            )}
            . O histórico textual poderá ser importado mesmo assim.
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Nome do contato
            <Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Número do WhatsApp com DDD
            <Input
              inputMode="tel"
              placeholder="5534999999999"
              value={phoneE164}
              onChange={(event) => setPhoneE164(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Remetente que representa a empresa
            <Select
              value={companySenderName}
              onValueChange={(value) => setCompanySenderName(value ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Selecione o remetente" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {archive.senders.map((sender) => (
                  <SelectItem key={sender.name} value={sender.name}>
                    {sender.name} · {plural(sender.messageCount, 'mensagem', 'mensagens')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Situação atual da conversa
            <Select
              value={state}
              onValueChange={(value) => setState(value as WhatsAppHistoryState)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Selecione a situação">
                  {state ? WHATSAPP_HISTORY_STATE_LABELS[state] : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {WHATSAPP_HISTORY_STATES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {WHATSAPP_HISTORY_STATE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Departamento responsável
            <Select
              value={department}
              onValueChange={(value) => setDepartment(value as WhatsAppHistoryDepartment)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>{WHATSAPP_HISTORY_DEPARTMENT_LABELS[department]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {WHATSAPP_HISTORY_DEPARTMENTS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {WHATSAPP_HISTORY_DEPARTMENT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {state === 'human-active' ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Usuário do atendente ativo
              <Input
                value={ownerUsername}
                onChange={(event) => setOwnerUsername(event.target.value)}
              />
            </label>
          ) : null}
        </div>
        <div>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
            {saving ? 'Salvando' : 'Salvar revisão'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function WhatsAppHistoryImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'zip-exports' | 'android-backup'>('android-backup');
  const [channels, setChannels] = useState<z.infer<typeof channelsSchema>>([]);
  const [channelId, setChannelId] = useState('');
  const [batch, setBatch] = useState<WhatsAppHistoryImportBatch | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<
    readonly { fileName: string; message: string }[]
  >([]);
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<WhatsAppHistoryReviewFilter>('needs-review');
  const [page, setPage] = useState(1);
  const [cutoffAt, setCutoffAt] = useState(localDateTimeValue);
  const [applying, setApplying] = useState(false);
  const [rootKey, setRootKey] = useState('');
  const [androidState, setAndroidState] = useState<WhatsAppHistoryState>('closed');
  const [androidDepartment, setAndroidDepartment] =
    useState<WhatsAppHistoryDepartment>('commercial');
  const [androidOwnerUsername, setAndroidOwnerUsername] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadCurrent, setMediaUploadCurrent] = useState(0);
  const [mediaUploadTotal, setMediaUploadTotal] = useState(0);
  const [mediaUploadErrors, setMediaUploadErrors] = useState<
    readonly { fileName: string; message: string }[]
  >([]);

  useEffect(() => {
    let active = true;
    void fetch('/api/whatsapp-history-import/channels', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await responseMessage(response, 'Não foi possível carregar os canais.'));
        }
        return channelsSchema.parse(await response.json());
      })
      .then((result) => {
        if (!active) return;
        setChannels(result);
        setChannelId(result[0]?.id ?? '');
      })
      .catch((error: unknown) => {
        toast.add({
          title: 'Canais indisponíveis',
          description: error instanceof Error ? error.message : 'Tente novamente.',
          type: 'error',
        });
      })
      .finally(() => {
        if (active) setLoadingChannels(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!batch || batch.status !== 'applying') return;
    const interval = window.setInterval(() => {
      void fetch(`/api/whatsapp-history-import/batches/${batch.id}`, {
        cache: 'no-store',
      })
        .then(parseBatch)
        .then(setBatch)
        .catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(interval);
  }, [batch]);

  const filteredArchives = useMemo(() => {
    if (!batch) return [];
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return batch.archives.filter((archive) => {
      const matchesStatus = reviewFilter === 'all' || archive.status === reviewFilter;
      const matchesSearch =
        !query ||
        archive.archiveName.toLocaleLowerCase('pt-BR').includes(query) ||
        archive.contactName?.toLocaleLowerCase('pt-BR').includes(query) ||
        archive.phoneE164?.includes(query);
      return matchesStatus && Boolean(matchesSearch);
    });
  }, [batch, reviewFilter, search]);
  const pageCount = Math.max(1, Math.ceil(filteredArchives.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleArchives = filteredArchives.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedChannel = channels.find((channel) => channel.id === channelId);

  async function ensureBatch(): Promise<WhatsAppHistoryImportBatch> {
    if (batch) return batch;
    if (!channelId) throw new Error('Selecione o canal de WhatsApp.');
    const response = await fetch('/api/whatsapp-history-import/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId: crypto.randomUUID(), channelId }),
    });
    const created = await parseBatch(response);
    setBatch(created);
    return created;
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    const accepted = selected.filter((file) =>
      file.name.toLocaleLowerCase('pt-BR').endsWith('.zip'),
    );
    const rejected = selected
      .filter((file) => !file.name.toLocaleLowerCase('pt-BR').endsWith('.zip'))
      .map((file) => ({
        fileName: file.name,
        message: 'O arquivo não é um backup ZIP do WhatsApp.',
      }));
    if (accepted.length === 0) {
      setUploadTotal(selected.length);
      setUploadCurrent(selected.length);
      setUploadSuccess(0);
      setUploadErrors(rejected);
      toast.add({
        title: 'Nenhum backup aceito',
        description: 'Selecione backups ZIP exportados pelo WhatsApp.',
        type: 'error',
      });
      return;
    }
    setUploading(true);
    setUploadCurrent(rejected.length);
    setUploadTotal(selected.length);
    setUploadSuccess(0);
    setUploadErrors(rejected);
    try {
      let currentBatch = await ensureBatch();
      const failures: Array<{ fileName: string; message: string }> = [...rejected];
      let successes = 0;
      for (let index = 0; index < accepted.length; index += 1) {
        const file = accepted[index];
        try {
          const formData = new FormData();
          formData.set('archive', file);
          const response = await fetch(
            `/api/whatsapp-history-import/batches/${currentBatch.id}/archives`,
            { method: 'POST', body: formData },
          );
          currentBatch = await parseBatch(response);
          successes += 1;
          setBatch(currentBatch);
          setUploadSuccess(successes);
        } catch (error) {
          failures.push({
            fileName: file.name,
            message: error instanceof Error ? error.message : 'O arquivo não pôde ser lido.',
          });
          setUploadErrors([...failures]);
        } finally {
          setUploadCurrent(rejected.length + index + 1);
          if (index < accepted.length - 1) {
            await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
          }
        }
      }
      toast.add({
        title: 'Backups processados',
        description:
          failures.length === 0
            ? `${plural(successes, 'arquivo foi lido', 'arquivos foram lidos')}. Revise os dados antes de aplicar.`
            : `${plural(successes, 'arquivo válido', 'arquivos válidos')} e ${plural(failures.length, 'arquivo com erro', 'arquivos com erro')}.`,
        type: failures.length === selected.length ? 'error' : 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Importação interrompida',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        type: 'error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function uploadAndroid(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLocaleLowerCase('pt-BR').endsWith('.crypt15')) {
      toast.add({
        title: 'Arquivo incompatível',
        description: 'Selecione o arquivo msgstore.db.crypt15.',
        type: 'error',
      });
      return;
    }
    if (!/^[0-9a-fA-F]{64}$/.test(rootKey.trim())) {
      toast.add({
        title: 'Chave inválida',
        description: 'Informe os 64 caracteres hexadecimais da chave crypt15.',
        type: 'error',
      });
      return;
    }
    if (androidState === 'human-active' && !androidOwnerUsername.trim()) {
      toast.add({
        title: 'Atendente obrigatório',
        description: 'Informe o usuário responsável pelo atendimento humano ativo.',
        type: 'error',
      });
      return;
    }
    setUploading(true);
    setUploadTotal(1);
    setUploadCurrent(0);
    setUploadErrors([]);
    try {
      const currentBatch = await ensureBatch();
      const formData = new FormData();
      formData.set('database', file);
      formData.set('rootKey', rootKey.trim());
      formData.set('state', androidState);
      formData.set('departmentCode', androidDepartment);
      if (androidOwnerUsername.trim()) {
        formData.set('ownerUsername', androidOwnerUsername.trim());
      }
      const response = await fetch(
        `/api/whatsapp-history-import/batches/${currentBatch.id}/android-backup`,
        { method: 'POST', body: formData },
      );
      const updated = await parseBatch(response);
      setBatch(updated);
      setImportMode('android-backup');
      setRootKey('');
      setUploadSuccess(1);
      toast.add({
        title: 'Backup completo validado',
        description: `${plural(updated.totals.archives, 'conversa encontrada', 'conversas encontradas')}.`,
        type: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'O backup não pôde ser lido.';
      setUploadErrors([{ fileName: file.name, message }]);
      toast.add({ title: 'Backup não validado', description: message, type: 'error' });
    } finally {
      setUploadCurrent(1);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function uploadAndroidMedia(files: FileList | null) {
    if (!batch?.androidBackup || batch.status !== 'applied' || !files?.length) return;
    const selected = Array.from(files);
    const accepted = selected.filter((file) =>
      file.name.toLocaleLowerCase('pt-BR').endsWith('.zip'),
    );
    const failures: Array<{ fileName: string; message: string }> = selected
      .filter((file) => !file.name.toLocaleLowerCase('pt-BR').endsWith('.zip'))
      .map((file) => ({
        fileName: file.name,
        message: 'Selecione um arquivo ZIP criado a partir da pasta Media.',
      }));
    setMediaUploading(true);
    setMediaUploadCurrent(failures.length);
    setMediaUploadTotal(selected.length);
    setMediaUploadErrors(failures);
    let currentBatch = batch;
    let successes = 0;
    try {
      for (let index = 0; index < accepted.length; index += 1) {
        const file = accepted[index];
        try {
          const formData = new FormData();
          formData.set('archive', file);
          const response = await fetch(
            `/api/whatsapp-history-import/batches/${batch.id}/android-media-archives`,
            { method: 'POST', body: formData },
          );
          currentBatch = await parseBatch(response);
          setBatch(currentBatch);
          successes += 1;
        } catch (error) {
          failures.push({
            fileName: file.name,
            message:
              error instanceof Error ? error.message : 'O ZIP de mídias não pôde ser processado.',
          });
          setMediaUploadErrors([...failures]);
        } finally {
          setMediaUploadCurrent(failures.length + successes);
        }
      }
      toast.add({
        title: failures.length === selected.length ? 'Mídias não vinculadas' : 'Mídias processadas',
        description:
          failures.length === 0
            ? `${plural(successes, 'arquivo ZIP processado', 'arquivos ZIP processados')}. Os arquivos encontrados já estão disponíveis nas conversas.`
            : `${plural(successes, 'arquivo processado', 'arquivos processados')} e ${plural(failures.length, 'arquivo com erro', 'arquivos com erro')}.`,
        type: failures.length === selected.length ? 'error' : 'success',
      });
    } finally {
      setMediaUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  }

  async function applyImport() {
    if (!batch) return;
    setApplying(true);
    try {
      const cutoffDate = new Date(cutoffAt);
      const response = await fetch(`/api/whatsapp-history-import/batches/${batch.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cutoffAt: cutoffDate.toISOString() }),
      });
      const updated = await parseBatch(response);
      setBatch(updated);
      toast.add({
        title: updated.status === 'applying' ? 'Importação iniciada' : 'Históricos importados',
        description:
          updated.status === 'applying'
            ? 'O backup está sendo processado em blocos. Você pode acompanhar o progresso nesta tela.'
            : 'As conversas foram consolidadas no painel do WhatsApp.',
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Importação não concluída',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        type: 'error',
      });
    } finally {
      setApplying(false);
    }
  }

  const readyToApply =
    batch !== null &&
    (batch.status === 'draft' || batch.status === 'failed') &&
    batch.totals.archives > 0 &&
    batch.totals.needsReview === 0;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/whatsapp-conversations"
        className={buttonVariants({ variant: 'ghost', className: 'mb-3' })}
      >
        <ArrowLeft /> Voltar ao painel
      </Link>
      <div className="max-w-4xl">
        <p className="text-sm font-semibold text-primary-emphasis">Painel WhatsApp</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Importar históricos de conversas
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Importe vários ZIPs individuais ou um banco completo do Android. Nenhuma conversa será
          gravada antes da confirmação final.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>1. Selecionar os backups</CardTitle>
          <CardDescription>
            Os arquivos são enviados um por vez para evitar sobrecarga. Backups repetidos são
            ignorados com segurança.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2" aria-label="Tipo de importação">
            <Button
              type="button"
              variant={importMode === 'android-backup' ? 'default' : 'outline'}
              disabled={Boolean(batch)}
              onClick={() => setImportMode('android-backup')}
            >
              <Database /> Backup Android completo
            </Button>
            <Button
              type="button"
              variant={importMode === 'zip-exports' ? 'default' : 'outline'}
              disabled={Boolean(batch)}
              onClick={() => setImportMode('zip-exports')}
            >
              <FileArchive /> ZIPs individuais
            </Button>
          </div>
          <label className="grid max-w-xl gap-1.5 text-sm font-medium">
            Canal de destino
            <Select
              value={channelId}
              onValueChange={(value) => setChannelId(value ?? '')}
              disabled={Boolean(batch)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder={loadingChannels ? 'Carregando' : 'Selecione o canal'}>
                  {selectedChannel
                    ? `${selectedChannel.name} · ${selectedChannel.phoneNumber}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name} · {channel.phoneNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {importMode === 'android-backup' && !batch?.androidBackup ? (
            <div className="grid max-w-3xl gap-4 rounded-lg border p-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
                Chave crypt15 de 64 caracteres
                <Input
                  type="password"
                  autoComplete="off"
                  value={rootKey}
                  onChange={(event) => setRootKey(event.target.value.replace(/\s/g, ''))}
                  placeholder="A chave não será armazenada"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Situação das conversas importadas
                <Select
                  value={androidState}
                  onValueChange={(value) => setAndroidState(value as WhatsAppHistoryState)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue>{WHATSAPP_HISTORY_STATE_LABELS[androidState]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {WHATSAPP_HISTORY_STATES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {WHATSAPP_HISTORY_STATE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Departamento responsável
                <Select
                  value={androidDepartment}
                  onValueChange={(value) =>
                    setAndroidDepartment(value as WhatsAppHistoryDepartment)
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue>
                      {WHATSAPP_HISTORY_DEPARTMENT_LABELS[androidDepartment]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {WHATSAPP_HISTORY_DEPARTMENTS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {WHATSAPP_HISTORY_DEPARTMENT_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              {androidState === 'human-active' ? (
                <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
                  Usuário do atendente responsável
                  <Input
                    value={androidOwnerUsername}
                    onChange={(event) => setAndroidOwnerUsername(event.target.value)}
                  />
                </label>
              ) : null}
              <p className="text-xs leading-5 text-muted-foreground md:col-span-2">
                As mídias ausentes serão marcadas como pendentes. Depois que as mensagens forem
                aplicadas, a etapa 4 desta tela permitirá selecionar os ZIPs da pasta Media sem
                duplicar o histórico.
              </p>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={
              importMode === 'android-backup'
                ? '.crypt15,application/octet-stream'
                : '.zip,application/zip'
            }
            multiple={importMode === 'zip-exports'}
            className="sr-only"
            onChange={(event) =>
              void (importMode === 'android-backup'
                ? uploadAndroid(event.target.files)
                : upload(event.target.files))
            }
          />
          <div>
            <Button
              type="button"
              size="lg"
              disabled={
                uploading ||
                !channelId ||
                batch?.status === 'applied' ||
                Boolean(batch?.androidBackup)
              }
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
              {uploading
                ? 'Processando backup'
                : importMode === 'android-backup'
                  ? 'Selecionar msgstore.db.crypt15'
                  : 'Selecionar arquivos ZIP'}
            </Button>
          </div>
          {uploadTotal > 0 ? (
            <div className="max-w-xl" aria-live="polite">
              <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                <span>Arquivos processados</span>
                <span>
                  {uploadCurrent} de {uploadTotal}
                </span>
              </div>
              <Progress value={uploadTotal ? (uploadCurrent / uploadTotal) * 100 : 0} />
              <p className="mt-2 text-xs text-muted-foreground">
                {plural(uploadSuccess, 'arquivo válido', 'arquivos válidos')} ·{' '}
                {plural(uploadErrors.length, 'arquivo com erro', 'arquivos com erro')}
              </p>
            </div>
          ) : null}
          {uploadErrors.length > 0 ? (
            <div className="max-w-3xl rounded-lg bg-destructive/10 p-3 text-sm text-destructive-emphasis">
              <p className="font-semibold">Arquivos que precisam de correção</p>
              <ul className="mt-2 grid gap-1">
                {uploadErrors.map((failure) => (
                  <li key={`${failure.fileName}:${failure.message}`}>
                    <strong>{failure.fileName}:</strong> {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {batch ? (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo">
            {[
              ['Backups', batch.totals.archives],
              ['Revisados', batch.totals.ready],
              ['A revisar', batch.totals.needsReview],
              ['Mensagens', batch.totals.messages],
              ['Anexos citados', batch.totals.attachments],
            ].map(([label, value]) => (
              <Card key={label} size="sm">
                <CardContent>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {batch.mode === 'zip-exports' ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>2. Revisar cada conversa</CardTitle>
                <CardDescription>
                  Confirme o número, quem representa a empresa e o estado em que a conversa deve
                  entrar no painel. O sistema não adivinha esses dados.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <label className="relative">
                    <span className="sr-only">Pesquisar conversas importadas</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Pesquisar por arquivo, nome ou telefone"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <Select
                    value={reviewFilter}
                    onValueChange={(value) => {
                      setReviewFilter(value as WhatsAppHistoryReviewFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue>
                        {WHATSAPP_HISTORY_REVIEW_FILTER_LABELS[reviewFilter]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {Object.entries(WHATSAPP_HISTORY_REVIEW_FILTER_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4">
                  {visibleArchives.map((archive) => (
                    <ArchiveReviewCard
                      key={archive.archiveId}
                      batchId={batch.id}
                      archive={archive}
                      onSaved={setBatch}
                    />
                  ))}
                  {visibleArchives.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Nenhuma conversa corresponde aos filtros.
                    </p>
                  ) : null}
                </div>
                {pageCount > 1 ? (
                  <nav
                    className="flex flex-wrap justify-center gap-2"
                    aria-label="Páginas da revisão"
                  >
                    {buildPaginationItems(currentPage, pageCount).map((value) =>
                      typeof value === 'number' ? (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={value === currentPage ? 'default' : 'outline'}
                          onClick={() => setPage(value)}
                          aria-current={value === currentPage ? 'page' : undefined}
                        >
                          {value}
                        </Button>
                      ) : (
                        <span
                          key={value}
                          className="inline-flex size-8 items-center justify-center text-muted-foreground"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      ),
                    )}
                  </nav>
                ) : null}
              </CardContent>
            </Card>
          ) : batch.androidBackup ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>2. Conferir o backup completo</CardTitle>
                <CardDescription>
                  Conversas individuais são importadas por telefone. Grupos, listas e status não
                  entram porque o painel atual é orientado a atendimentos individuais.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <p>
                  <strong>{batch.androidBackup.summary.groupConversationsExcluded}</strong> grupos
                  excluídos
                </p>
                <p>
                  <strong>{batch.androidBackup.summary.groupMessagesExcluded}</strong> mensagens de
                  grupos
                </p>
                <p>
                  <strong>{batch.androidBackup.summary.otherConversationsExcluded}</strong> chats
                  técnicos excluídos
                </p>
                <p>
                  <strong>{batch.androidBackup.summary.mediaReferences}</strong> mídias pendentes
                </p>
                {batch.status === 'applying' ? (
                  <div className="sm:col-span-2 xl:col-span-4">
                    <div className="mb-2 flex justify-between text-muted-foreground">
                      <span>Importando em blocos</span>
                      <span>
                        {batch.androidBackup.messagesProcessed} de {batch.totals.messages}
                      </span>
                    </div>
                    <Progress
                      value={
                        batch.totals.messages
                          ? (batch.androidBackup.messagesProcessed / batch.totals.messages) * 100
                          : 0
                      }
                    />
                  </div>
                ) : null}
                {batch.status === 'failed' && batch.androidBackup.errorMessage ? (
                  <p className="rounded-lg bg-destructive/10 p-3 text-destructive-emphasis sm:col-span-2 xl:col-span-4">
                    {batch.androidBackup.errorMessage}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>3. Conferir e aplicar</CardTitle>
              <CardDescription>
                A planilha usa o mesmo contrato oficial do importador existente. Aplicar é
                idempotente: repetir o mesmo lote não duplica mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-end">
              <label className="grid gap-1.5 text-sm font-medium">
                Importar mensagens registradas até
                <Input
                  type="datetime-local"
                  value={cutoffAt}
                  onChange={(event) => setCutoffAt(event.target.value)}
                  disabled={batch.status === 'applied'}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {batch.mode === 'zip-exports' ? (
                  <Link
                    href={`/api/whatsapp-history-import/batches/${batch.id}/workbook`}
                    className={buttonVariants({ variant: 'outline' })}
                    aria-disabled={!readyToApply && batch.status !== 'applied'}
                    onClick={(event) => {
                      if (!readyToApply && batch.status !== 'applied') event.preventDefault();
                    }}
                  >
                    <Download /> Baixar planilha consolidada
                  </Link>
                ) : null}
                <Button
                  type="button"
                  onClick={() => void applyImport()}
                  disabled={!readyToApply || applying || batch.status === 'applying'}
                >
                  {applying ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
                  {applying ? 'Aplicando' : 'Aplicar importação'}
                </Button>
              </div>
              {batch.status === 'applied' ? (
                <p className="rounded-lg bg-success/10 p-3 text-sm font-medium text-success-emphasis lg:col-span-2">
                  Este lote já foi aplicado. As conversas estão disponíveis no painel.
                </p>
              ) : batch.status === 'applying' ? (
                <p className="text-sm text-muted-foreground lg:col-span-2">
                  A importação continua em segundo plano. Não feche ou reinicie a API durante o
                  processamento.
                </p>
              ) : batch.totals.needsReview > 0 ? (
                <p className="text-sm text-muted-foreground lg:col-span-2">
                  Revise{' '}
                  {plural(batch.totals.needsReview, 'conversa pendente', 'conversas pendentes')}{' '}
                  para liberar a aplicação.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {batch.mode === 'android-backup' &&
          batch.androidBackup &&
          batch.status === 'applied' &&
          batch.androidBackup.summary.mediaReferences > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>4. Vincular mídias das conversas</CardTitle>
                <CardDescription>
                  Envie um ou vários ZIPs da pasta Media. Arquivos já vinculados são ignorados e
                  você pode retomar esta etapa depois.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-6">
                  <p>
                    Compacte a pasta <strong>WhatsApp/Media</strong> ou{' '}
                    <strong>WhatsApp Business/Media</strong>. Se ela for muito grande, divida o
                    conteúdo em vários ZIPs e selecione todos de uma vez.
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    O arquivo <strong>Backups.zip</strong> contém bancos auxiliares do Android e não
                    contém as fotos, áudios, vídeos e documentos das conversas.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Mídias citadas', batch.androidBackup.summary.mediaReferences],
                    ['Mídias armazenadas', batch.androidBackup.mediaImport?.stored ?? 0],
                    [
                      'Mídias pendentes',
                      batch.androidBackup.mediaImport?.pending ??
                        batch.androidBackup.summary.mediaReferences,
                    ],
                    ['ZIPs processados', batch.androidBackup.mediaImport?.archivesProcessed ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="max-w-2xl">
                  <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                    <span>Arquivos disponíveis nas conversas</span>
                    <span>
                      {batch.androidBackup.mediaImport?.stored ?? 0} de{' '}
                      {batch.androidBackup.summary.mediaReferences}
                    </span>
                  </div>
                  <Progress
                    value={
                      (100 * (batch.androidBackup.mediaImport?.stored ?? 0)) /
                      batch.androidBackup.summary.mediaReferences
                    }
                  />
                </div>

                <input
                  ref={mediaInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  multiple
                  className="sr-only"
                  onChange={(event) => void uploadAndroidMedia(event.target.files)}
                />
                <div>
                  <Button
                    type="button"
                    size="lg"
                    disabled={mediaUploading}
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    {mediaUploading ? <LoaderCircle className="animate-spin" /> : <Paperclip />}
                    {mediaUploading ? 'Processando mídias' : 'Selecionar ZIPs da pasta Media'}
                  </Button>
                </div>

                {mediaUploadTotal > 0 ? (
                  <div className="max-w-2xl" aria-live="polite">
                    <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                      <span>ZIPs enviados nesta tentativa</span>
                      <span>
                        {mediaUploadCurrent} de {mediaUploadTotal}
                      </span>
                    </div>
                    <Progress
                      value={mediaUploadTotal ? (mediaUploadCurrent / mediaUploadTotal) * 100 : 0}
                    />
                  </div>
                ) : null}

                {mediaUploadErrors.length > 0 ? (
                  <div className="max-w-3xl rounded-lg bg-destructive/10 p-3 text-sm text-destructive-emphasis">
                    <p className="font-semibold">Arquivos que não foram processados</p>
                    <ul className="mt-2 grid gap-1">
                      {mediaUploadErrors.map((failure) => (
                        <li key={`${failure.fileName}:${failure.message}`}>
                          <strong>{failure.fileName}:</strong> {failure.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
