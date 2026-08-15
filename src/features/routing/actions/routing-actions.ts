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

function failure(path: string, error: unknown): never {
  if (error instanceof RoutingError && error.code === 'unauthorized')
    redirect('/auth/session-expired');
  const message =
    error instanceof RoutingError ? error.message : 'Não foi possível concluir a operação.';
  redirect(`${path}?error=${encodeURIComponent(message)}`);
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
  redirect('/routing/companies?success=Empresa atendida cadastrada.');
}

export async function createRoutingContractAction(data: FormData): Promise<void> {
  const requiredDocuments = value(data, 'requiredDocumentTypeCodes')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.createContract({
        routingCompanyId: value(data, 'routingCompanyId'),
        code: value(data, 'code'),
        name: value(data, 'name'),
        operationType: value(data, 'operationType'),
        routeType: value(data, 'routeType') || 'municipal',
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
        shifts: [
          {
            name: value(data, 'shiftName'),
            requiredArrivalTime: value(data, 'requiredArrivalTime'),
            vehicleCount: value(data, 'shiftVehicleCount')
              ? numberValue(data, 'shiftVehicleCount', 1)
              : null,
            vehicleCapacity: value(data, 'shiftVehicleCapacity')
              ? numberValue(data, 'shiftVehicleCapacity', 1)
              : null,
            activeWeekdays: data.getAll('activeWeekdays').map(Number),
          },
        ],
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
    redirect('/routing/passengers?error=Selecione o arquivo XLSX.');
  try {
    await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.importPassengers(file, randomUUID()),
    );
  } catch (error) {
    failure('/routing/passengers', error);
  }
  revalidatePath('/routing');
  revalidatePath('/routing/passengers');
  redirect(
    '/routing/passengers?success=Planilha processada. Consulte os registros pendentes antes de gerar rotas.',
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
