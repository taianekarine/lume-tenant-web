'use client';

import { FilePlus2, List, LoaderCircle } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import {
  getConversationQuoteProposalsAction,
  type ConversationQuoteProposalsActionResult,
} from '@/features/quote-proposals/actions';
import { ProposalHistory } from '@/features/quote-proposals/components';
import type { PendingQuoteProposal } from '@/features/quote-proposals/domain';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

import type { WhatsAppConversation } from '../domain';

interface ConversationQuoteActionsProps {
  readonly conversation: WhatsAppConversation;
  readonly currentUserId: string | null;
  readonly onChanged: () => void;
  readonly onError: (message: string) => void;
}

function toCreationSeed(
  conversation: WhatsAppConversation,
  currentUserId: string | null,
): PendingQuoteProposal {
  const quote = conversation.currentQuoteRequest;
  return {
    stage: 'pending',
    conversationState: conversation.conversationState,
    requestStatus: conversation.requestStatus,
    quoteRequestId: quote?.id ?? conversation.id,
    quoteRequestVersion: quote?.version ?? 1,
    conversationId: conversation.id,
    conversationVersion: conversation.version,
    contact: {
      id: conversation.contact.id,
      name: conversation.contact.name,
      phone: conversation.contact.phone,
    },
    summary: {
      sequence: quote?.sequence ?? 0,
      contactName: quote?.contactName ?? conversation.contact.name,
      document: quote?.document ?? null,
      email: quote?.email ?? null,
      serviceType: quote?.serviceType ?? null,
      origin: quote?.origin ?? null,
      destination: quote?.destination ?? null,
      departureDate: quote?.departureDate ?? null,
      departureAt: quote?.departureAt ?? null,
      returnDate: quote?.returnDate ?? null,
      returnAt: quote?.returnAt ?? null,
      passengerCount: quote?.passengerCount ?? null,
      vehicleType: quote?.vehicleType ?? null,
      vehicleAtDisposal: quote?.vehicleAtDisposal ?? null,
      localTransfers: quote?.localTransfers ?? null,
      notes: quote?.notes ?? null,
      structuredData: quote?.structuredData ?? {},
    },
    proposalDocument: null,
    requestedAt: quote?.createdAt ?? conversation.createdAt,
    requestedBy: {
      id: currentUserId,
      name: conversation.assignedTo?.name ?? 'Atendente atual',
      type: 'attendant',
    },
    decision: {
      status: 'pending',
      reason: null,
      decidedAt: null,
      decidedBy: null,
    },
    updatedAt: quote?.updatedAt ?? conversation.updatedAt,
  };
}

export function ConversationQuoteActions({
  conversation,
  currentUserId,
  onChanged,
  onError,
}: ConversationQuoteActionsProps) {
  const [isListOpen, setIsListOpen] = useState(false);
  const [proposals, setProposals] = useState<readonly PendingQuoteProposal[]>([]);
  const [listError, setListError] = useState('');
  const [isLoading, startLoading] = useTransition();
  const creationSeed = useMemo(
    () => toCreationSeed(conversation, currentUserId),
    [conversation, currentUserId],
  );
  const canCreate =
    conversation.department === 'commercial' &&
    conversation.conversationState !== 'closed' &&
    conversation.assignedTo?.id === currentUserId;

  function applyResult(result: ConversationQuoteProposalsActionResult) {
    if (result.success) {
      setProposals(result.proposals);
      setListError('');
      return;
    }
    setListError(result.message);
  }

  function openList() {
    setIsListOpen(true);
    setListError('');
    startLoading(async () => {
      applyResult(await getConversationQuoteProposalsAction(conversation.id));
    });
  }

  function registerProposal(proposal: PendingQuoteProposal) {
    setProposals((current) => [
      proposal,
      ...current.filter((item) => item.quoteRequestId !== proposal.quoteRequestId),
    ]);
    onChanged();
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={openList}>
        <List aria-hidden="true" />
        Lista de orçamentos
      </Button>
      <div
        title={
          canCreate ? undefined : 'Assuma o atendimento comercial antes de criar um orçamento.'
        }
        className={!canCreate ? 'cursor-not-allowed' : undefined}
      >
        {canCreate ? (
          <ProposalHistory
            proposals={[creationSeed]}
            total={1}
            onCreated={registerProposal}
            onDecided={registerProposal}
            onError={onError}
            showDecisionActions={false}
            compactCreateOnly
          />
        ) : (
          <Button type="button" variant="outline" disabled>
            <FilePlus2 aria-hidden="true" />
            Criar orçamento
          </Button>
        )}
      </div>

      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Orçamentos da conversa</DialogTitle>
            <DialogDescription>
              Solicitações e PDFs vinculados a {conversation.contact.name}.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Carregando orçamentos...
            </p>
          ) : listError ? (
            <p role="alert" className="text-sm text-destructive-emphasis">
              {listError}
            </p>
          ) : (
            <ProposalHistory
              proposals={proposals}
              total={proposals.length}
              title="Lista de orçamentos"
              description="Histórico completo das solicitações desta conversa."
              emptyMessage="Nenhum orçamento foi vinculado a esta conversa."
              itemLabel={{ singular: 'orçamento', plural: 'orçamentos' }}
              showCreateAction={false}
              showDecisionActions={false}
              onCreated={registerProposal}
              onDecided={registerProposal}
              onError={onError}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
