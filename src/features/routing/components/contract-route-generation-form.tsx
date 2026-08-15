'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

import { generateContractRoutesAction } from '../actions';
import {
  contractActiveWeekdays,
  isContractServiceDate,
  nextContractServiceDate,
} from '../domain/contract-service-date';
import type { RoutingContract } from '../domain/routing';

export function ContractRouteGenerationForm({
  contract,
  referenceDate,
}: {
  readonly contract: RoutingContract;
  readonly referenceDate: string;
}) {
  const suggestedDate = nextContractServiceDate(contract, referenceDate);
  const [serviceDate, setServiceDate] = useState(suggestedDate ?? '');
  const validDate = Boolean(serviceDate && isContractServiceDate(contract, serviceDate));

  return (
    <form action={generateContractRoutesAction} className="space-y-1 text-left">
      <input type="hidden" name="contractId" value={contract.id} />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Input
          className="h-8 w-40"
          type="date"
          name="serviceDate"
          value={serviceDate}
          min={contract.validFrom}
          max={contract.validUntil ?? undefined}
          onChange={(event) => setServiceDate(event.target.value)}
          aria-label={`Data para gerar ${contract.name}`}
          required
        />
        <Button size="sm" type="submit" disabled={!validDate}>
          <Sparkles className="size-4" />
          Gerar sugestões
        </Button>
      </div>
      <p className={`text-xs ${validDate ? 'text-muted-foreground' : 'text-destructive'}`}>
        {validDate
          ? `Turnos ativos: ${contractActiveWeekdays(contract)}.`
          : suggestedDate
            ? `Escolha um dia ativo. Próxima data válida: ${suggestedDate}.`
            : 'O contrato não possui uma próxima data operacional válida.'}
      </p>
    </form>
  );
}
