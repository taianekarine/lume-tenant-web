import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DocumentUploadForm } from './document-upload-form';

const mockRefresh = jest.fn();
const mockReplace = jest.fn();
const fetchMock = jest.fn();
const getUserMedia = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, replace: mockReplace }),
}));

function renderForm(
  requiresFrontBack = false,
  options: { readonly initiallyExpanded?: boolean; readonly successUrl?: string } = {},
) {
  return render(
    <DocumentUploadForm
      uploadUrl="/api/document-management/items/document-1/submissions/complete"
      itemId="document-1"
      accepts={['application/pdf', 'image/jpeg', 'image/png']}
      requiresFrontBack={requiresFrontBack}
      repeatableByDependent={false}
      allowsMultiplePages={false}
      replace={false}
      initiallyExpanded={options.initiallyExpanded}
      successUrl={options.successUrl}
    />,
  );
}

describe('DocumentUploadForm', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockRefresh.mockReset();
    mockReplace.mockReset();
    fetchMock.mockReset();
    getUserMedia.mockReset();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:document-photo'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ drawImage: jest.fn() } as unknown as CanvasRenderingContext2D);
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
  });

  it('monta somente o seletor de arquivo sem acionar a câmera externa', () => {
    const { container } = renderForm();

    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar arquivo' }));

    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).not.toHaveAttribute('capture');
    expect(inputs[0]).toHaveAttribute('accept', 'application/pdf,image/jpeg,image/png');
    expect(container.querySelector('[capture]')).not.toBeInTheDocument();
  });

  it('envia o multipart pela rota autenticada sem usar Server Action', async () => {
    const interaction = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ request: {} }), { status: 200 }));
    const { container } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar arquivo' }));
    const picker = container.querySelector('#document-1-single-picker') as HTMLInputElement;
    await interaction.upload(picker, new File(['imagem'], 'documento.jpg', { type: 'image/jpeg' }));
    await interaction.click(screen.getByRole('button', { name: 'Enviar documento' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/document-management/items/document-1/submissions/complete',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
    const upload = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect([...upload.keys()]).toEqual(['commandId', 'files', 'sides', 'pageNumbers']);
    expect((upload.get('files') as File).name).toBe('documento.jpg');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('Documento enviado para revisão.');
  });

  it('não aplica um limite arbitrário ao tamanho escolhido pelo usuário', async () => {
    const interaction = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ request: {} }), { status: 200 }));
    const { container } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar arquivo' }));
    const picker = container.querySelector('#document-1-single-picker') as HTMLInputElement;
    const oversized = new File(['x'], 'grande.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: 25 * 1024 * 1024 + 1 });
    await interaction.upload(picker, oversized);
    await interaction.click(screen.getByRole('button', { name: 'Enviar documento' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('retorna ao dossiê após concluir o envio na tela leve', async () => {
    const interaction = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ request: {} }), { status: 200 }));
    const { container } = renderForm(false, {
      initiallyExpanded: true,
      successUrl: '/documents/request-1?success=Documento%20enviado',
    });

    const picker = container.querySelector('#document-1-single-picker') as HTMLInputElement;
    await interaction.upload(picker, new File(['pdf'], 'ctps.pdf', { type: 'application/pdf' }));
    await interaction.click(screen.getByRole('button', { name: 'Enviar documento' }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/documents/request-1?success=Documento%20enviado'),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('captura frente e verso sequencialmente sem manter dois streams', async () => {
    const firstTrackStop = jest.fn();
    const secondTrackStop = jest.fn();
    getUserMedia
      .mockResolvedValueOnce({
        getTracks: () => [{ stop: firstTrackStop }],
      } as unknown as MediaStream)
      .mockResolvedValueOnce({
        getTracks: () => [{ stop: secondTrackStop }],
      } as unknown as MediaStream);
    const { container } = renderForm(true, { initiallyExpanded: true });
    const frontSlot = screen.getByText('Frente').parentElement as HTMLElement;
    const backSlot = screen.getByText('Verso').parentElement as HTMLElement;

    await userEvent.click(within(frontSlot).getByRole('button', { name: 'Tirar foto' }));
    const frontVideo = await within(frontSlot).findByLabelText('Câmera para frente');
    Object.defineProperties(frontVideo, {
      videoWidth: { configurable: true, value: 1280 },
      videoHeight: { configurable: true, value: 960 },
    });
    expect(within(backSlot).getByRole('button', { name: 'Tirar foto' })).toBeDisabled();
    await userEvent.click(within(frontSlot).getByRole('button', { name: 'Tirar foto' }));
    await userEvent.click(await within(frontSlot).findByRole('button', { name: 'Usar esta foto' }));

    expect(firstTrackStop).toHaveBeenCalledTimes(1);
    expect(within(backSlot).getByRole('button', { name: 'Tirar foto' })).toBeEnabled();
    await userEvent.click(within(backSlot).getByRole('button', { name: 'Tirar foto' }));
    const backVideo = await within(backSlot).findByLabelText('Câmera para verso');
    Object.defineProperties(backVideo, {
      videoWidth: { configurable: true, value: 1280 },
      videoHeight: { configurable: true, value: 960 },
    });
    await userEvent.click(within(backSlot).getByRole('button', { name: 'Tirar foto' }));
    await userEvent.click(await within(backSlot).findByRole('button', { name: 'Usar esta foto' }));

    expect(secondTrackStop).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[capture]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar documento' })).toBeEnabled();
  });
});
