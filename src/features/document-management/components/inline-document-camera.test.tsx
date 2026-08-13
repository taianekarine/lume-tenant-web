import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  DOCUMENT_CAMERA_CONSTRAINTS,
  DOCUMENT_CAMERA_JPEG_QUALITY,
  InlineDocumentCamera,
} from './inline-document-camera';

function mediaStream(trackStop = jest.fn()): MediaStream {
  return { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;
}

describe('InlineDocumentCamera', () => {
  const getUserMedia = jest.fn();
  const drawImage = jest.fn();
  const createObjectURL = jest.fn(() => 'blob:document-photo');
  const revokeObjectURL = jest.fn();
  const onUsePhoto = jest.fn();
  const onSessionChange = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    getUserMedia.mockReset();
    drawImage.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    onUsePhoto.mockReset();
    onSessionChange.mockReset();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['jpeg otimizado'], { type: 'image/jpeg' }));
    });
  });

  function renderCamera() {
    return render(
      <InlineDocumentCamera
        id="rg-front"
        label="Frente"
        onUsePhoto={onUsePhoto}
        onSessionChange={onSessionChange}
      />,
    );
  }

  async function openLiveCamera(stream = mediaStream()) {
    getUserMedia.mockResolvedValueOnce(stream);
    renderCamera();
    await userEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));
    const video = await screen.findByLabelText('Câmera para frente');
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 4032 },
      videoHeight: { configurable: true, value: 3024 },
    });
    return video;
  }

  it('abre a câmera traseira dentro da página com resolução controlada', async () => {
    await openLiveCamera();

    expect(getUserMedia).toHaveBeenCalledWith(DOCUMENT_CAMERA_CONSTRAINTS);
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
    });
    expect(onSessionChange).toHaveBeenCalledWith(true);
  });

  it('captura um frame limitado, converte para JPEG e encerra todas as tracks', async () => {
    const videoTrackStop = jest.fn();
    const auxiliaryTrackStop = jest.fn();
    const video = await openLiveCamera({
      getTracks: () => [{ stop: videoTrackStop }, { stop: auxiliaryTrackStop }],
    } as unknown as MediaStream);

    await userEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));

    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 960);
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      DOCUMENT_CAMERA_JPEG_QUALITY,
    );
    expect(videoTrackStop).toHaveBeenCalledTimes(1);
    expect(auxiliaryTrackStop).toHaveBeenCalledTimes(1);
    expect(await screen.findByAltText('Prévia da foto de frente')).toBeInTheDocument();
    expect(screen.getByText(/1280 × 960 pixels/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    expect(onUsePhoto).toHaveBeenCalledWith(expect.any(File));
    expect((onUsePhoto.mock.calls[0]?.[0] as File).type).toBe('image/jpeg');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:document-photo');
  });

  it('encerra a câmera imediatamente ao cancelar', async () => {
    const stop = jest.fn();
    await openLiveCamera(mediaStream(stop));

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(stop).toHaveBeenCalledTimes(1);
    expect(onSessionChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeInTheDocument();
  });

  it('libera a primeira captura antes de tirar novamente', async () => {
    const firstStop = jest.fn();
    const secondStop = jest.fn();
    getUserMedia
      .mockResolvedValueOnce(mediaStream(firstStop))
      .mockResolvedValueOnce(mediaStream(secondStop));
    renderCamera();
    await userEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));
    const firstVideo = await screen.findByLabelText('Câmera para frente');
    Object.defineProperties(firstVideo, {
      videoWidth: { configurable: true, value: 1280 },
      videoHeight: { configurable: true, value: 960 },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Tirar novamente' }));

    expect(firstStop).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:document-photo');
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(await screen.findByLabelText('Câmera para frente')).toBeInTheDocument();
  });

  it('oferece escolher arquivo quando getUserMedia não existe', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    renderCamera();

    await userEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A câmera integrada não está disponível neste navegador. Escolha um arquivo.',
    );
  });

  it('oferece escolher arquivo quando a permissão é negada', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('negado', 'NotAllowedError'));
    renderCamera();

    await userEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A permissão da câmera foi recusada. Autorize a câmera ou escolha um arquivo.',
    );
    expect(onSessionChange).toHaveBeenLastCalledWith(false);
  });

  it('encerra tracks pendentes quando o componente é desmontado', async () => {
    const stop = jest.fn();
    getUserMedia.mockResolvedValueOnce(mediaStream(stop));
    const view = renderCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));
    await screen.findByLabelText('Câmera para frente');

    view.unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
