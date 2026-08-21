import { fireEvent, render, screen } from '@testing-library/react';

import type { RoutingPassenger } from '../domain/routing';
import { PassengerEditor } from './passenger-editor';

jest.mock('../actions', () => ({
  updateRoutingPassengerAction: jest.fn(),
}));

const passenger: RoutingPassenger = {
  id: '00000000-0000-4000-8000-000000000001',
  routingCompanyId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Pessoa importada',
  externalReference: 'BOOK14-0056',
  shift: null,
  requiredArrivalTime: null,
  sector: 'T01',
  status: 'active',
  registrationStatus: 'pending',
  routingEligible: false,
  accessibilityRequired: false,
  accessibilityNotes: null,
  residenceStreet: 'Rua A',
  residenceNumber: '10',
  residenceComplement: null,
  residenceDistrict: 'Centro',
  residencePostalCode: '38400000',
  residenceCity: 'Uberlândia',
  residenceState: 'MG',
  documents: [],
  version: 1,
};

describe('PassengerEditor', () => {
  it('fills shift and arrival time from a contract while keeping manual editing available', () => {
    render(
      <PassengerEditor
        passenger={passenger}
        contractShifts={[
          {
            name: 'MANHÃ',
            requiredArrivalTime: '07:50',
            vehicleCount: 2,
            vehicleCapacity: 25,
            activeWeekdays: [1, 2, 3, 4, 5],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByText(/editar \/ completar dados/i));
    fireEvent.change(screen.getByLabelText(/preencher com turno do contrato/i), {
      target: { value: '0' },
    });

    expect(screen.getByLabelText(/^turno$/i)).toHaveValue('MANHÃ');
    expect(screen.getByLabelText(/horário informado/i)).toHaveValue('07:50');
    expect(screen.getByLabelText(/^cep$/i)).toHaveValue('38400-000');
  });
});
