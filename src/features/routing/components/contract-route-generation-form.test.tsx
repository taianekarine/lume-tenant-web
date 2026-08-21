import { fireEvent, render, screen } from '@testing-library/react';

import type { RoutingContract } from '../domain/routing';
import { ContractRouteGenerationForm } from './contract-route-generation-form';

jest.mock('../actions', () => ({
  generateContractRoutesAction: jest.fn(),
}));

const contract: RoutingContract = {
  id: '00000000-0000-4000-8000-000000000001',
  routingCompanyId: '00000000-0000-4000-8000-000000000002',
  originFixedPointId: null,
  destinationFixedPointId: null,
  code: 'VAR001',
  name: 'Valoriza',
  operationType: 'Fretamento continuo',
  routeType: 'municipal',
  status: 'active',
  periodicity: 'daily',
  contractedVehicleCount: 2,
  predictedVehicleName: 'Micro-onibus',
  predictedVehicleCapacity: 25,
  contractedKm: null,
  plannedKm: null,
  unitName: 'Unidade Valoriza',
  validFrom: '2026-08-15',
  validUntil: '2028-01-10',
  costCenters: [],
  shifts: [
    {
      name: 'MANHÃ',
      requiredArrivalTime: '07:50',
      vehicleCount: 2,
      vehicleCapacity: 25,
      activeWeekdays: [1, 2, 3, 4, 5],
    },
  ],
  version: 1,
};

describe('ContractRouteGenerationForm', () => {
  it('defaults to the next active date and blocks inactive weekdays', () => {
    render(<ContractRouteGenerationForm contract={contract} referenceDate="2026-08-15" />);

    const date = screen.getByLabelText(/data para gerar valoriza/i);
    expect(date).toHaveValue('2026-08-17');
    expect(screen.getByRole('button', { name: /gerar sugestões/i })).toBeEnabled();

    fireEvent.change(date, { target: { value: '2026-08-22' } });

    expect(screen.getByRole('button', { name: /gerar sugestões/i })).toBeDisabled();
    expect(screen.getByText(/escolha um dia ativo/i)).toBeInTheDocument();
  });
});
