import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { lookupPostalCodeAddress } from '../infrastructure/postal-code-address-client';
import { PostalCodeAddressFields } from './postal-code-address-fields';

jest.mock('../infrastructure/postal-code-address-client', () => ({
  lookupPostalCodeAddress: jest.fn(),
}));

const mockedLookup = jest.mocked(lookupPostalCodeAddress);

describe('PostalCodeAddressFields', () => {
  beforeEach(() => {
    mockedLookup.mockReset();
    mockedLookup.mockResolvedValue({
      postalCode: '01001-000',
      street: 'Praça da Sé',
      complement: 'lado ímpar',
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      ibgeCode: '3550308',
    });
  });

  it('automatically fills the shared address fields after eight CEP digits', async () => {
    render(<PostalCodeAddressFields prefix="origin" title="Ponto de saída" />);

    fireEvent.change(screen.getByLabelText('Número'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '01001000' } });

    await waitFor(() => expect(mockedLookup).toHaveBeenCalledWith('01001000', expect.anything()));
    await waitFor(() => expect(screen.getByLabelText('Logradouro')).toHaveValue('Praça da Sé'));
    expect(screen.getByLabelText('Bairro')).toHaveValue('Sé');
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo');
    expect(screen.getByLabelText('UF')).toHaveValue('SP');
    expect(screen.getByLabelText('CEP')).toHaveValue('01001-000');
    expect(screen.getByLabelText('Número')).toHaveValue('100');
    expect(screen.getByLabelText('Complemento')).toHaveValue('lado ímpar');
    expect(screen.getByText(/Endereço preenchido/)).toBeInTheDocument();
  });

  it('does not query an incomplete CEP', async () => {
    render(<PostalCodeAddressFields prefix="destination" title="Destino" />);

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '01001' } });

    await new Promise((resolve) => window.setTimeout(resolve, 350));
    expect(mockedLookup).not.toHaveBeenCalled();
  });
});
