import { fireEvent, render, screen } from '@testing-library/react';

import { PassengerImportPanel } from './passenger-import-panel';

jest.mock('../actions', () => ({
  importRoutingPassengersAction: jest.fn(),
}));

const client = {
  id: '00000000-0000-4000-8000-000000000001',
  taxId: '52998224725',
  legalName: 'Cliente de teste',
  tradeName: null,
  costCenter: null,
  status: 'active' as const,
  version: 1,
};

describe('PassengerImportPanel', () => {
  it('enables import only after a client and a file are selected', () => {
    render(<PassengerImportPanel companies={[client, { ...client, id: 'client-2' }]} />);

    const submit = screen.getByRole('button', { name: /importar planilha/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/cliente dos colaboradores/i), {
      target: { value: client.id },
    });
    expect(submit).toBeDisabled();

    const file = new File(['planilha'], 'colaboradores.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(screen.getByLabelText(/escolher planilha/i), {
      target: { files: [file] },
    });

    expect(screen.getByText('Selecionado: colaboradores.xlsx')).toBeInTheDocument();
    expect(submit).toBeEnabled();
  });
});
