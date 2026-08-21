'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { createRoutingContractAction } from '../actions';
import type { RoutingAddress, RoutingCompany, RoutingFixedPoint } from '../domain/routing';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

const weekdays = [
  ['1', 'Seg'],
  ['2', 'Ter'],
  ['3', 'Qua'],
  ['4', 'Qui'],
  ['5', 'Sex'],
  ['6', 'Sab'],
  ['0', 'Dom'],
] as const;

function AddressFields({ prefix, address }: { prefix: string; address: RoutingAddress }) {
  return (
    <>
      <input type="hidden" name={`${prefix}Label`} value={address.label} />
      <input type="hidden" name={`${prefix}Street`} value={address.street} />
      <input type="hidden" name={`${prefix}Number`} value={address.number} />
      <input type="hidden" name={`${prefix}Complement`} value={address.complement ?? ''} />
      <input type="hidden" name={`${prefix}District`} value={address.district} />
      <input type="hidden" name={`${prefix}PostalCode`} value={address.postalCode} />
      <input type="hidden" name={`${prefix}City`} value={address.city} />
      <input type="hidden" name={`${prefix}State`} value={address.state} />
    </>
  );
}

export function ContractCreationForm({
  companies,
  fixedPoints,
}: {
  readonly companies: readonly RoutingCompany[];
  readonly fixedPoints: readonly RoutingFixedPoint[];
}) {
  const [routingCompanyId, setRoutingCompanyId] = useState('');
  const [routeType, setRouteType] = useState<'municipal' | 'intermunicipal'>('municipal');
  const [shiftIds, setShiftIds] = useState([0]);
  const [nextShiftId, setNextShiftId] = useState(1);
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const availablePoints = useMemo(
    () =>
      fixedPoints.filter(
        (point) => !point.routingCompanyId || point.routingCompanyId === routingCompanyId,
      ),
    [fixedPoints, routingCompanyId],
  );
  const origin = availablePoints.find((point) => point.id === originId);
  const destination = availablePoints.find((point) => point.id === destinationId);
  const chooseClient = (id: string) => {
    setRoutingCompanyId(id);
    setOriginId('');
    setDestinationId('');
  };
  const addShift = () => {
    setShiftIds((current) => [...current, nextShiftId]);
    setNextShiftId((current) => current + 1);
  };

  return (
    <form action={createRoutingContractAction} className="space-y-6">
      <input type="hidden" name="shiftCount" value={shiftIds.length} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="contract-company">Cliente</Label>
          <select
            id="contract-company"
            name="routingCompanyId"
            value={routingCompanyId}
            onChange={(event) => chooseClient(event.target.value)}
            required
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Selecione</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.tradeName || company.legalName} - {company.taxId}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contract-code">Codigo</Label>
          <Input id="contract-code" name="code" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contract-name">Nome</Label>
          <Input id="contract-name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="operation-type">Tipo de operacao</Label>
          <Input
            id="operation-type"
            name="operationType"
            placeholder="Fretamento continuo"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="route-type">Abrangencia</Label>
          <select
            id="route-type"
            name="routeType"
            value={routeType}
            onChange={(event) => setRouteType(event.target.value as typeof routeType)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="municipal">Municipal</option>
            <option value="intermunicipal">Intermunicipal</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodicity">Periodicidade do KM</Label>
          <select
            id="periodicity"
            name="periodicity"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="daily">Diaria</option>
            <option value="per-route">Por rota</option>
          </select>
        </div>
        <input type="hidden" name="status" value="active" />
        <div className="space-y-2">
          <Label htmlFor="unit-name">Unidade atendida</Label>
          <Input id="unit-name" name="unitName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valid-from">Inicio da vigencia</Label>
          <Input id="valid-from" name="validFrom" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valid-until">Fim da vigencia</Label>
          <Input id="valid-until" name="validUntil" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-count">Veiculos contratados</Label>
          <Input
            id="vehicle-count"
            name="contractedVehicleCount"
            type="number"
            min={1}
            defaultValue={1}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-name">Veiculo previsto</Label>
          <Input
            id="vehicle-name"
            name="predictedVehicleName"
            placeholder="Micro-onibus"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-reference">Referencia / prefixo</Label>
          <Input id="vehicle-reference" name="predictedVehicleReference" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-capacity">Capacidade prevista por veiculo</Label>
          <Input
            id="vehicle-capacity"
            name="predictedVehicleCapacity"
            type="number"
            min={1}
            defaultValue={28}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contracted-km">KM contratado</Label>
          <Input id="contracted-km" name="contractedKm" type="number" min={0} step="0.001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planned-km">KM previsto</Label>
          <Input id="planned-km" name="plannedKm" type="number" min={0} step="0.001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-walk">Caminhada maxima (m)</Label>
          <Input
            id="max-walk"
            name="maxWalkingDistanceMeters"
            type="number"
            min={0}
            defaultValue={500}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost-code">Centro de custo</Label>
          <Input id="cost-code" name="costCenterCode" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost-name">Descricao do centro</Label>
          <Input id="cost-name" name="costCenterName" />
        </div>
        {routeType === 'intermunicipal' ? (
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="documents">Dados documentais exigidos</Label>
            <Input
              id="documents"
              name="requiredDocumentTypeCodes"
              placeholder="cpf, matricula (separados por virgula)"
            />
            <p className="text-xs text-muted-foreground">
              Esta exigencia se aplica somente a contratos intermunicipais.
            </p>
          </div>
        ) : null}
      </div>

      <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <legend className="px-2 text-sm font-semibold">Pontos do contrato</legend>
        <div className="space-y-2">
          <Label htmlFor="origin-fixed-point">Ponto de saida</Label>
          <select
            id="origin-fixed-point"
            name="originFixedPointId"
            value={originId}
            onChange={(event) => setOriginId(event.target.value)}
            required
            disabled={!routingCompanyId}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Selecione um ponto fixo</option>
            {availablePoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name} ({point.code})
              </option>
            ))}
          </select>
          {origin ? (
            <p className="text-xs text-muted-foreground">
              {origin.address.street}, {origin.address.number} - {origin.address.city}/
              {origin.address.state}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination-fixed-point">Destino / unidade</Label>
          <select
            id="destination-fixed-point"
            name="destinationFixedPointId"
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
            required
            disabled={!routingCompanyId}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Selecione um ponto fixo</option>
            {availablePoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name} ({point.code})
              </option>
            ))}
          </select>
          {destination ? (
            <p className="text-xs text-muted-foreground">
              {destination.address.street}, {destination.address.number} -{' '}
              {destination.address.city}/{destination.address.state}
            </p>
          ) : null}
        </div>
        {origin ? <AddressFields prefix="origin" address={origin.address} /> : null}
        {destination ? <AddressFields prefix="destination" address={destination.address} /> : null}
        {routingCompanyId && availablePoints.length === 0 ? (
          <p className="text-sm text-destructive sm:col-span-2">
            Cadastre ao menos um ponto fixo global ou deste cliente antes de criar o contrato.
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Turnos e horarios</h3>
            <p className="text-sm text-muted-foreground">
              Adicione todos os turnos previstos no mesmo contrato.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addShift}>
            <Plus className="size-4" />
            Adicionar turno
          </Button>
        </div>
        {shiftIds.map((id, index) => (
          <fieldset
            key={id}
            className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <legend className="px-2 text-sm font-semibold">Turno {index + 1}</legend>
            <div className="space-y-2">
              <Label htmlFor={`shift-name-${id}`}>Turno</Label>
              <Input id={`shift-name-${id}`} name={`shifts.${index}.name`} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`arrival-time-${id}`}>Chegada obrigatoria</Label>
              <Input
                id={`arrival-time-${id}`}
                name={`shifts.${index}.requiredArrivalTime`}
                type="time"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`shift-vehicles-${id}`}>Veiculos neste turno</Label>
              <Input
                id={`shift-vehicles-${id}`}
                name={`shifts.${index}.vehicleCount`}
                type="number"
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Se vazio, usa a quantidade geral do contrato.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`shift-capacity-${id}`}>Capacidade por veiculo neste turno</Label>
              <Input
                id={`shift-capacity-${id}`}
                name={`shifts.${index}.vehicleCapacity`}
                type="number"
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Limite de colaboradores em cada veiculo deste turno. Se vazio, usa a capacidade
                prevista geral.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 sm:col-span-2 lg:col-span-4">
              {weekdays.map(([day, label]) => (
                <label key={day} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`shifts.${index}.activeWeekdays`}
                    value={day}
                    defaultChecked={day !== '0' && day !== '6'}
                  />
                  {label}
                </label>
              ))}
            </div>
            {shiftIds.length > 1 ? (
              <div className="sm:col-span-2 lg:col-span-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShiftIds((current) => current.filter((value) => value !== id))}
                >
                  <Trash2 className="size-4" />
                  Remover turno
                </Button>
              </div>
            ) : null}
          </fieldset>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contract-notes">Observacoes</Label>
        <Textarea id="contract-notes" name="notes" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!origin || !destination}>
          Cadastrar contrato
        </Button>
      </div>
    </form>
  );
}
