'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { RoutingError } from '../application';
import { executeAuthenticatedRoutingMutation } from '../server';

function value(data: FormData, key: string): string {
  const current = data.get(key);
  return typeof current === 'string' ? current.trim() : '';
}

function numberValue(data: FormData, key: string, fallback: number): number {
  const parsed = Number(value(data, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function address(data: FormData, prefix: string) {
  return {
    label: value(data, `${prefix}Label`),
    street: value(data, `${prefix}Street`),
    number: value(data, `${prefix}Number`),
    complement: value(data, `${prefix}Complement`) || null,
    district: value(data, `${prefix}District`),
    postalCode: value(data, `${prefix}PostalCode`),
    city: value(data, `${prefix}City`),
    state: value(data, `${prefix}State`).toUpperCase(),
    latitude: null,
    longitude: null,
  };
}

function passengerResidence(data: FormData) {
  const residence = address(data, value(data, 'residencePrefix') || 'residence');
  return {
    street: residence.street,
    number: residence.number,
    complement: residence.complement,
    district: residence.district,
    postalCode: residence.postalCode,
    city: residence.city,
    state: residence.state,
    latitude: residence.latitude,
    longitude: residence.longitude,
  };
}

function passengerDocuments(data: FormData) {
  let preserved: { documentTypeCode: string; data: Record<string, unknown> }[] = [];
  try {
    const parsed = JSON.parse(value(data, 'preservedDocuments')) as unknown;
    if (Array.isArray(parsed)) {
      preserved = parsed.filter(
        (item): item is { documentTypeCode: string; data: Record<string, unknown> } =>
          Boolean(
            item &&
            typeof item === 'object' &&
            'documentTypeCode' in item &&
            typeof item.documentTypeCode === 'string' &&
            'data' in item &&
            item.data &&
            typeof item.data === 'object' &&
            !Array.isArray(item.data),
          ),
      );
    }
  } catch {
    preserved = [];
  }
  const known = new Set(['cpf', 'matricula', 'observacoes-documentais']);
  const documents = preserved.filter((item) => !known.has(item.documentTypeCode));
  const cpf = value(data, 'cpf');
  const registration = value(data, 'registration');
  const notes = value(data, 'documentNotes');
  if (cpf) documents.push({ documentTypeCode: 'cpf', data: { numero: cpf } });
  if (registration) {
    documents.push({ documentTypeCode: 'matricula', data: { numero: registration } });
  }
  if (notes) {
    documents.push({
      documentTypeCode: 'observacoes-documentais',
      data: { observacoes: notes },
    });
  }
  return documents;
}

function failure(path: string, error: unknown): never {
  if (error instanceof RoutingError && error.code === 'unauthorized')
    redirect('/auth/session-expired');
  const message =
    error instanceof RoutingError ? error.message : 'Não foi possível concluir a operação.';
  const separator = path.includes('?') ? '&' : '?';
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

export async function createRoutingCompanyAction(data: FormData): Promise<void> {
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.createCompany({
        taxId: value(data, 'taxId'),
        legalName: value(data, 'legalName'),
        tradeName: value(data, 'tradeName') || undefined,
        costCenter: value(data, 'costCenter') || undefined,
      }),
    );
  } catch (error) {
    failure('/routing/companies', error);
  }
  revalidatePath('/routing');
  revalidatePath('/routing/companies');
  redirect('/routing/companies?success=Cliente cadastrado.');
}

export async function updateRoutingCompanyAction(data: FormData): Promise<void> {
  const id = value(data, 'routingCompanyId');
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.updateCompany(id, {
        expectedVersion: numberValue(data, 'expectedVersion', 1),
        taxId: value(data, 'taxId'),
        legalName: value(data, 'legalName'),
        tradeName: value(data, 'tradeName') || null,
        costCenter: value(data, 'costCenter') || null,
        status: value(data, 'status') || 'active',
      }),
    );
  } catch (error) {
    failure('/routing/companies', error);
  }
  revalidatePath('/routing/companies');
  redirect('/routing/companies?success=Dados do cliente atualizados.');
}

export async function deleteRoutingCompanyAction(data: FormData): Promise<void> {
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.deleteCompany(value(data, 'routingCompanyId'), value(data, 'password')),
    );
  } catch (error) {
    failure('/routing/companies', error);
  }
  revalidatePath('/routing/companies');
  redirect('/routing/companies?success=Cliente excluido.');
}

export async function createFixedPointAction(data: FormData): Promise<void> {
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.createFixedPoint({
        name: value(data, 'name'),
        routingCompanyId: value(data, 'routingCompanyId') || null,
        address: address(data, 'address'),
      }),
    );
  } catch (error) {
    failure('/routing/fixed-points', error);
  }
  revalidatePath('/routing/fixed-points');
  revalidatePath('/routing/contracts');
  redirect('/routing/fixed-points?success=Ponto fixo cadastrado.');
}

export async function createRoutingContractAction(data: FormData): Promise<void> {
  const routeType = value(data, 'routeType') || 'municipal';
  const requiredDocuments = (
    routeType === 'intermunicipal' ? value(data, 'requiredDocumentTypeCodes') : ''
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const shiftCount = Math.max(1, numberValue(data, 'shiftCount', 1));
  const shifts = Array.from({ length: shiftCount }, (_, index) => ({
    name: value(data, `shifts.${index}.name`),
    requiredArrivalTime: value(data, `shifts.${index}.requiredArrivalTime`),
    vehicleCount: value(data, `shifts.${index}.vehicleCount`)
      ? numberValue(data, `shifts.${index}.vehicleCount`, 1)
      : null,
    vehicleCapacity: value(data, `shifts.${index}.vehicleCapacity`)
      ? numberValue(data, `shifts.${index}.vehicleCapacity`, 1)
      : null,
    activeWeekdays: data.getAll(`shifts.${index}.activeWeekdays`).map(Number),
  }));
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.createContract({
        routingCompanyId: value(data, 'routingCompanyId'),
        originFixedPointId: value(data, 'originFixedPointId'),
        destinationFixedPointId: value(data, 'destinationFixedPointId'),
        code: value(data, 'code'),
        name: value(data, 'name'),
        operationType: value(data, 'operationType'),
        routeType,
        status: value(data, 'status') || 'active',
        periodicity: value(data, 'periodicity') || 'monthly',
        contractedVehicleCount: numberValue(data, 'contractedVehicleCount', 1),
        predictedVehicleName: value(data, 'predictedVehicleName'),
        predictedVehicleReference: value(data, 'predictedVehicleReference') || null,
        predictedVehicleCapacity: numberValue(data, 'predictedVehicleCapacity', 1),
        contractedKm: value(data, 'contractedKm') ? numberValue(data, 'contractedKm', 0) : null,
        plannedKm: value(data, 'plannedKm') ? numberValue(data, 'plannedKm', 0) : null,
        maxWalkingDistanceMeters: numberValue(data, 'maxWalkingDistanceMeters', 500),
        requiresDocumentation: requiredDocuments.length > 0,
        requiredDocumentTypeCodes: requiredDocuments,
        unitName: value(data, 'unitName'),
        origin: address(data, 'origin'),
        destination: address(data, 'destination'),
        validFrom: value(data, 'validFrom'),
        validUntil: value(data, 'validUntil') || null,
        notes: value(data, 'notes') || null,
        costCenters: [
          { code: value(data, 'costCenterCode'), name: value(data, 'costCenterName') || null },
        ],
        shifts,
      }),
    );
  } catch (error) {
    failure('/routing/contracts', error);
  }
  revalidatePath('/routing');
  revalidatePath('/routing/contracts');
  redirect('/routing/contracts?success=Contrato cadastrado. Ele já pode orientar a roteirização.');
}

export async function importRoutingPassengersAction(data: FormData): Promise<void> {
  const file = data.get('file');
  if (!(file instanceof File) || file.size === 0)
    redirect('/routing/passengers?error=Selecione uma planilha.');
  const routingCompanyId = value(data, 'routingCompanyId');
  if (!routingCompanyId)
    redirect('/routing/passengers?error=Selecione o cliente dos colaboradores.');
  let batchId = '';
  try {
    const result = await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.importPassengers(file, randomUUID(), routingCompanyId),
    );
    batchId = result.batch.id;
  } catch (error) {
    failure('/routing/passengers', error);
  }
  revalidatePath('/routing');
  revalidatePath('/routing/passengers');
  redirect(
    `/routing/passengers?batchId=${encodeURIComponent(batchId)}&success=${encodeURIComponent('Planilha processada. Consulte os registros pendentes antes de gerar rotas.')}`,
  );
}

export async function resolvePassengerImportAddressAction(data: FormData): Promise<void> {
  const batchId = value(data, 'batchId');
  const prefix = value(data, 'correctionPrefix');
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.resolvePassengerImportAddress(batchId, value(data, 'recordId'), {
        postalCode: value(data, `${prefix}PostalCode`),
        number: value(data, `${prefix}Number`),
        complement: value(data, `${prefix}Complement`) || null,
      }),
    );
  } catch (error) {
    failure(`/routing/passengers?batchId=${encodeURIComponent(batchId)}`, error);
  }
  revalidatePath('/routing/passengers');
  redirect(
    `/routing/passengers?batchId=${encodeURIComponent(batchId)}&success=${encodeURIComponent('Endereco do colaborador atualizado.')}`,
  );
}

export async function updateRoutingPassengerAction(data: FormData): Promise<void> {
  const passengerId = value(data, 'passengerId');
  const batchId = value(data, 'batchId');
  const recordId = value(data, 'recordId');
  const input = {
    fullName: value(data, 'fullName'),
    externalReference: value(data, 'externalReference') || null,
    shift: value(data, 'shift') || null,
    requiredArrivalTime: value(data, 'requiredArrivalTime') || null,
    sector: value(data, 'sector') || null,
    accessibilityRequired: data.has('accessibilityRequired'),
    accessibilityNotes: value(data, 'accessibilityNotes') || null,
    residence: passengerResidence(data),
    documents: passengerDocuments(data),
  };
  const returnPath = batchId
    ? `/routing/passengers?batchId=${encodeURIComponent(batchId)}`
    : '/routing/passengers';
  try {
    if (batchId && recordId) {
      await executeAuthenticatedRoutingMutation((gateway) =>
        gateway.resolvePassengerImportData(batchId, recordId, input),
      );
    } else {
      await executeAuthenticatedRoutingMutation((gateway) =>
        gateway.updatePassenger(passengerId, {
          ...input,
          expectedVersion: numberValue(data, 'expectedVersion', 1),
        }),
      );
    }
  } catch (error) {
    failure(returnPath, error);
  }
  revalidatePath('/routing/passengers');
  revalidatePath('/routing/contracts');
  const separator = returnPath.includes('?') ? '&' : '?';
  redirect(
    `${returnPath}${separator}success=${encodeURIComponent('Dados do colaborador atualizados e pendencias reavaliadas.')}`,
  );
}

export async function generateContractRoutesAction(data: FormData): Promise<void> {
  const contractId = value(data, 'contractId');
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.generateRoutes(
        contractId,
        value(data, 'serviceDate'),
        value(data, 'shiftId') || undefined,
      ),
    );
  } catch (error) {
    failure('/routing/contracts', error);
  }
  revalidatePath('/routing/routes');
  redirect(
    '/routing/routes?success=Rotas sugeridas pela IA. Revise os pontos e aprove quando estiverem corretos.',
  );
}

export async function routeLifecycleAction(data: FormData): Promise<void> {
  const routeId = value(data, 'routeId');
  const version = numberValue(data, 'expectedVersion', 1);
  const operation = value(data, 'operation');
  try {
    await executeAuthenticatedRoutingMutation((gateway) => {
      if (operation === 'approve') return gateway.approveRoute(routeId, version);
      if (operation === 'publish') return gateway.publishRoute(routeId, version);
      return gateway.transitionRoute(
        routeId,
        operation as 'routed' | 'in-review' | 'pending-approval',
        version,
      );
    });
  } catch (error) {
    failure(`/routing/routes/${routeId}`, error);
  }
  revalidatePath('/routing/routes');
  revalidatePath(`/routing/routes/${routeId}`);
  redirect(`/routing/routes/${routeId}?success=Situação da rota atualizada.`);
}
