import type {
  RoutingBinary,
  RoutingCompany,
  RoutingContract,
  RoutingList,
  RoutingPassenger,
  RoutingRoute,
  RoutingRouteDetail,
  RoutingRouteStatus,
} from '../domain/routing';

export type RoutingErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'invalid-response'
  | 'service-unavailable';

export class RoutingError extends Error {
  constructor(
    readonly code: RoutingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}

export interface RoutingGateway {
  listCompanies(query?: { search?: string; status?: string }): Promise<RoutingList<RoutingCompany>>;
  createCompany(input: Record<string, unknown>): Promise<RoutingCompany>;
  listContracts(query?: {
    routingCompanyId?: string;
    search?: string;
    status?: string;
  }): Promise<RoutingList<RoutingContract>>;
  createContract(input: Record<string, unknown>): Promise<RoutingContract>;
  listPassengers(query?: {
    routingCompanyId?: string;
    search?: string;
    status?: string;
    registrationStatus?: string;
  }): Promise<RoutingList<RoutingPassenger>>;
  createPassenger(input: Record<string, unknown>): Promise<RoutingPassenger>;
  passengerTemplate(): Promise<RoutingBinary>;
  importPassengers(file: File, commandId: string): Promise<unknown>;
  listRoutes(query?: {
    routingCompanyId?: string;
    search?: string;
    status?: string;
  }): Promise<RoutingList<RoutingRoute>>;
  getRoute(routeId: string): Promise<RoutingRouteDetail>;
  generateRoutes(
    contractId: string,
    serviceDate: string,
    shiftId?: string,
  ): Promise<{ readonly routes: readonly RoutingRouteDetail[] }>;
  transitionRoute(
    routeId: string,
    status: RoutingRouteStatus,
    expectedVersion: number,
  ): Promise<RoutingRouteDetail>;
  approveRoute(routeId: string, expectedVersion: number): Promise<RoutingRouteDetail>;
  publishRoute(routeId: string, expectedVersion: number): Promise<RoutingRouteDetail>;
  downloadRoute(
    routeId: string,
    format: 'pdf' | 'xlsx' | 'my-maps.xlsx' | 'my-maps.csv',
  ): Promise<RoutingBinary>;
}
