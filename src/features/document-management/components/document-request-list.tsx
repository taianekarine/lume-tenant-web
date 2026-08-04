import Link from 'next/link';

import type { DocumentRequestSummary } from '../domain';
import { DOCUMENT_CONTEXT_LABELS, DOCUMENT_STATUS_LABELS } from '../domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export function DocumentRequestList({
  requests,
  management = false,
}: {
  readonly requests: readonly DocumentRequestSummary[];
  readonly management?: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma solicitação documental encontrada.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => {
        const progress = request.progress.total
          ? Math.round((request.progress.approved / request.progress.total) * 100)
          : 0;
        return (
          <Link
            key={request.id}
            href={`${management ? '/document-management' : '/documents'}/${request.id}`}
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardHeader>
                <CardTitle>{request.checklist.name}</CardTitle>
                <CardDescription>
                  {management ? `${request.subject.name} · ` : ''}
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
          </Link>
        );
      })}
    </div>
  );
}
