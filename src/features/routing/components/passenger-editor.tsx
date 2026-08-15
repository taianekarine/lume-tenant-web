'use client';

import { PencilLine, Save } from 'lucide-react';
import { useState } from 'react';

import { PostalCodeAddressFields } from '@/shared/address';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import { updateRoutingPassengerAction } from '../actions';
import type { RoutingContractShift, RoutingPassenger } from '../domain/routing';

function documentValue(
  passenger: RoutingPassenger,
  documentTypeCode: string,
  field: string,
): string {
  const value = passenger.documents.find(
    (document) => document.documentTypeCode === documentTypeCode,
  )?.data[field];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function PassengerEditor({
  passenger,
  contractShifts,
  importRecord,
}: {
  readonly passenger: RoutingPassenger;
  readonly contractShifts: readonly RoutingContractShift[];
  readonly importRecord?: { readonly batchId: string; readonly recordId: string };
}) {
  const [shift, setShift] = useState(passenger.shift ?? '');
  const [requiredArrivalTime, setRequiredArrivalTime] = useState(
    passenger.requiredArrivalTime ?? '',
  );
  const uniqueContractShifts = contractShifts.filter(
    (candidate, index, values) =>
      values.findIndex(
        (value) =>
          value.name.toLocaleLowerCase('pt-BR') === candidate.name.toLocaleLowerCase('pt-BR') &&
          value.requiredArrivalTime === candidate.requiredArrivalTime,
      ) === index,
  );
  const prefix = `passenger${passenger.id.replaceAll('-', '')}${importRecord?.recordId.replaceAll('-', '') ?? 'list'}`;
  const residencePrefix = `${prefix}Residence`;

  return (
    <details className="w-full min-w-0 rounded-lg border bg-background">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-primary">
        <PencilLine className="size-4" />
        Editar / completar dados
      </summary>
      <form action={updateRoutingPassengerAction} className="space-y-5 border-t p-4">
        <input type="hidden" name="passengerId" value={passenger.id} />
        <input type="hidden" name="expectedVersion" value={passenger.version} />
        <input type="hidden" name="residencePrefix" value={residencePrefix} />
        <input
          type="hidden"
          name="preservedDocuments"
          value={JSON.stringify(passenger.documents)}
        />
        {importRecord ? (
          <>
            <input type="hidden" name="batchId" value={importRecord.batchId} />
            <input type="hidden" name="recordId" value={importRecord.recordId} />
          </>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${prefix}-full-name`}>Nome completo</Label>
            <Input
              id={`${prefix}-full-name`}
              name="fullName"
              defaultValue={passenger.fullName}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-external-reference`}>Identificador</Label>
            <Input
              id={`${prefix}-external-reference`}
              name="externalReference"
              defaultValue={passenger.externalReference ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-sector`}>Setor</Label>
            <Input id={`${prefix}-sector`} name="sector" defaultValue={passenger.sector ?? ''} />
          </div>

          {uniqueContractShifts.length > 0 ? (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`${prefix}-contract-shift`}>Preencher com turno do contrato</Label>
              <select
                id={`${prefix}-contract-shift`}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue=""
                onChange={(event) => {
                  const selected = uniqueContractShifts[Number(event.target.value)];
                  if (!selected) return;
                  setShift(selected.name);
                  setRequiredArrivalTime(selected.requiredArrivalTime);
                }}
              >
                <option value="">Selecione para preencher automaticamente</option>
                {uniqueContractShifts.map((candidate, index) => (
                  <option key={`${candidate.name}-${candidate.requiredArrivalTime}`} value={index}>
                    {candidate.name} — chegada {candidate.requiredArrivalTime}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-shift`}>Turno</Label>
            <Input
              id={`${prefix}-shift`}
              name="shift"
              value={shift}
              onChange={(event) => setShift(event.target.value)}
              placeholder="Ex.: MANHÃ"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-arrival-time`}>Horário informado</Label>
            <Input
              id={`${prefix}-arrival-time`}
              name="requiredArrivalTime"
              type="time"
              value={requiredArrivalTime}
              onChange={(event) => setRequiredArrivalTime(event.target.value)}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
            O turno deve coincidir com o contrato. Ao gerar a rota, o horário contratual é a
            referência de chegada; este horário pode guardar a informação individual importada.
          </p>
        </div>

        <PostalCodeAddressFields
          prefix={residencePrefix}
          title="Endereço residencial"
          showPointName={false}
          initialValue={{
            street: passenger.residenceStreet ?? '',
            number: passenger.residenceNumber ?? '',
            complement: passenger.residenceComplement ?? '',
            district: passenger.residenceDistrict ?? '',
            postalCode: passenger.residencePostalCode ?? '',
            city: passenger.residenceCity ?? '',
            state: passenger.residenceState ?? '',
          }}
        />

        <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="px-2 text-sm font-semibold">Acessibilidade e documentos</legend>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2 lg:col-span-3">
            <input
              name="accessibilityRequired"
              type="checkbox"
              defaultChecked={passenger.accessibilityRequired}
            />
            Necessita acessibilidade
          </label>
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label htmlFor={`${prefix}-accessibility-notes`}>Observação de acessibilidade</Label>
            <Input
              id={`${prefix}-accessibility-notes`}
              name="accessibilityNotes"
              defaultValue={passenger.accessibilityNotes ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-cpf`}>CPF</Label>
            <Input
              id={`${prefix}-cpf`}
              name="cpf"
              defaultValue={documentValue(passenger, 'cpf', 'numero')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-registration`}>Matrícula funcional</Label>
            <Input
              id={`${prefix}-registration`}
              name="registration"
              defaultValue={documentValue(passenger, 'matricula', 'numero')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-document-notes`}>Observações documentais</Label>
            <Input
              id={`${prefix}-document-notes`}
              name="documentNotes"
              defaultValue={documentValue(passenger, 'observacoes-documentais', 'observacoes')}
            />
          </div>
        </fieldset>

        <Button type="submit">
          <Save className="size-4" />
          Salvar e reavaliar pendências
        </Button>
      </form>
    </details>
  );
}
