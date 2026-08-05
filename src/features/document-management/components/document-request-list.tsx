'use client';

import { useMemo, useState } from 'react';

import type { DocumentRequestSummary } from '../domain';
import { DOCUMENT_CONTEXT_LABELS, DOCUMENT_STATUS_LABELS } from '../domain';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

const statusPriority: Readonly<Record<string, number>> = {
  'pending-upload': 0,
  'pending-human-review': 1,
  approved: 2,
};

function progressOf(request: DocumentRequestSummary): number {
  return request.progress.total
    ? Math.round((request.progress.approved / request.progress.total) * 100)
    : 0;
}

function RequestCard({
  request,
  management,
  onOpen,
}: {
  readonly request: DocumentRequestSummary;
  readonly management: boolean;
  readonly onOpen?: (request: DocumentRequestSummary) => void;
}) {
  const progress = progressOf(request);
  const content = (
    <Card className="h-full transition-colors hover:bg-muted/30">
      <CardHeader>
        <CardTitle>{management ? request.subject.name : request.checklist.name}</CardTitle>
        <CardDescription>
          {management ? `${request.checklist.name} · ` : ''}
          {DOCUMENT_CONTEXT_LABELS[request.context]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>{DOCUMENT_STATUS_LABELS[request.status]}</span>
          <strong>{progress}%</strong>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {request.deadline
            ? `Prazo: ${new Date(request.deadline).toLocaleDateString('pt-BR')}`
            : 'Sem prazo definido'}
        </p>
      </CardContent>
    </Card>
  );

  if (management) {
    return (
      <button
        type="button"
        onClick={() => onOpen?.(request)}
        className="rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        aria-label={`Revisar documentos de ${request.subject.name}`}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={`/documents/${request.id}`}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      {content}
    </a>
  );
}

function RequestGrid({
  requests,
  management,
  onOpen,
}: {
  readonly requests: readonly DocumentRequestSummary[];
  readonly management: boolean;
  readonly onOpen?: (request: DocumentRequestSummary) => void;
}) {
  if (!requests.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum funcionário encontrado neste grupo.
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} management={management} onOpen={onOpen} />
      ))}
    </div>
  );
}

function representativeRequests(
  requests: readonly DocumentRequestSummary[],
): readonly DocumentRequestSummary[] {
  const byUser = new Map<string, DocumentRequestSummary>();
  for (const request of requests) {
    const current = byUser.get(request.subject.id);
    if (!current) {
      byUser.set(request.subject.id, request);
      continue;
    }
    const requestPending = request.status !== 'approved' && request.status !== 'cancelled';
    const currentPending = current.status !== 'approved' && current.status !== 'cancelled';
    if (
      (requestPending && !currentPending) ||
      (requestPending === currentPending && request.updatedAt > current.updatedAt)
    ) {
      byUser.set(request.subject.id, request);
    }
  }
  return [...byUser.values()];
}

export function DocumentRequestList({
  requests,
  management = false,
}: {
  readonly requests: readonly DocumentRequestSummary[];
  readonly management?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [context, setContext] = useState('all');
  const [selected, setSelected] = useState<DocumentRequestSummary | null>(null);

  const normalized = useMemo(() => {
    const source = management ? [...representativeRequests(requests)] : [...requests];
    return source.sort((left, right) => {
      const priority = (statusPriority[left.status] ?? 10) - (statusPriority[right.status] ?? 10);
      return priority || right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [management, requests]);

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma solicitação documental encontrada.
      </div>
    );
  }

  if (!management) {
    const approved = normalized.filter((request) => request.status === 'approved');
    const active = normalized.filter((request) => request.status !== 'approved');
    return (
      <div className="space-y-4">
        <RequestGrid requests={active} management={false} />
        {approved.length ? (
          <Card>
            <CardContent>
              <Accordion>
                <AccordionItem value="approved">
                  <AccordionTrigger>Documentos aprovados ({approved.length})</AccordionTrigger>
                  <AccordionContent>
                    <RequestGrid requests={approved} management={false} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  const filtered = normalized.filter((request) => {
    const needle = search.trim().toLocaleLowerCase('pt-BR');
    return (
      (!needle ||
        `${request.subject.name} ${request.subject.email}`
          .toLocaleLowerCase('pt-BR')
          .includes(needle)) &&
      (status === 'all' || request.status === status) &&
      (context === 'all' || request.context === context)
    );
  });
  const pending = filtered.filter(
    (request) => request.status !== 'approved' && request.status !== 'cancelled',
  );
  const approved = filtered.filter((request) => request.status === 'approved');

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_15rem_15rem]">
        <label className="space-y-1 text-sm font-medium">
          <span>Pesquisar funcionário</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou e-mail"
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 w-full rounded-lg border bg-background px-3"
          >
            <option value="all">Todos</option>
            {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Contexto</span>
          <select
            value={context}
            onChange={(event) => setContext(event.target.value)}
            className="h-9 w-full rounded-lg border bg-background px-3"
          >
            <option value="all">Todos</option>
            {Object.entries(DOCUMENT_CONTEXT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Com pendências ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Completos ({approved.length})</TabsTrigger>
          <TabsTrigger value="all">Todos ({filtered.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <RequestGrid requests={pending} management onOpen={setSelected} />
        </TabsContent>
        <TabsContent value="approved">
          <RequestGrid requests={approved} management onOpen={setSelected} />
        </TabsContent>
        <TabsContent value="all">
          <RequestGrid requests={filtered} management onOpen={setSelected} />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="h-[92vh] max-w-[min(96vw,1500px)] grid-rows-[auto_1fr] p-0">
          <DialogHeader className="border-b p-4 pr-12">
            <DialogTitle>Revisão documental — {selected?.subject.name}</DialogTitle>
            <DialogDescription>
              Revise, confirme dados, substitua arquivos e registre a decisão sem sair desta tela.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <iframe
              title={`Revisão documental de ${selected.subject.name}`}
              src={`/document-management/${selected.id}?embedded=1`}
              className="h-full min-h-0 w-full rounded-b-xl bg-background"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
