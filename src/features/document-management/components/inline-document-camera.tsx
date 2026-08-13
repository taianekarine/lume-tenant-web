'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, RotateCcw, X } from 'lucide-react';

import { Button } from '@/shared/ui/button';

export const DOCUMENT_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 960 },
  },
};

export const DOCUMENT_CAMERA_JPEG_QUALITY = 0.82;
const MAX_CAPTURE_EDGE = 1280;
const MAX_CAPTURE_PIXELS = 1280 * 960;

type CameraPhase = 'idle' | 'opening' | 'live' | 'processing' | 'captured';

interface CapturedPhoto {
  readonly file: File;
  readonly previewUrl: string;
  readonly width: number;
  readonly height: number;
}

function captureDimensions(sourceWidth: number, sourceHeight: number) {
  const scale = Math.min(
    1,
    MAX_CAPTURE_EDGE / Math.max(sourceWidth, sourceHeight),
    Math.sqrt(MAX_CAPTURE_PIXELS / (sourceWidth * sourceHeight)),
  );
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'A permissão da câmera foi recusada. Autorize a câmera ou escolha um arquivo.';
  }
  return 'Não foi possível acessar a câmera neste aparelho. Escolha um arquivo para continuar.';
}

export function InlineDocumentCamera({
  id,
  label,
  disabled = false,
  onUsePhoto,
  onSessionChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly onUsePhoto: (file: File) => void;
  readonly onSessionChange: (active: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestSequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const previewUrlRef = useRef<string | null>(null);
  const onSessionChangeRef = useRef(onSessionChange);
  const [phase, setPhase] = useState<CameraPhase>('idle');
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSessionChangeRef.current = onSessionChange;
  }, [onSessionChange]);

  const releaseStream = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }, []);

  useEffect(() => {
    if (phase !== 'live' || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setError('Toque novamente em “Tirar foto” para iniciar a câmera.');
    });
  }, [phase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
      releaseStream();
      releasePreview();
      onSessionChangeRef.current(false);
    };
  }, [releasePreview, releaseStream]);

  const closeCamera = useCallback(() => {
    requestSequenceRef.current += 1;
    releaseStream();
    onSessionChange(false);
  }, [onSessionChange, releaseStream]);

  const clearCapture = useCallback(() => {
    releasePreview();
    setCaptured(null);
  }, [releasePreview]);

  const openCamera = useCallback(async () => {
    clearCapture();
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('A câmera integrada não está disponível neste navegador. Escolha um arquivo.');
      setPhase('idle');
      onSessionChange(false);
      return;
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    onSessionChange(true);
    setPhase('opening');
    try {
      const stream = await navigator.mediaDevices.getUserMedia(DOCUMENT_CAMERA_CONSTRAINTS);
      if (!mountedRef.current || requestSequenceRef.current !== requestSequence) {
        stopTracks(stream);
        return;
      }
      streamRef.current = stream;
      setPhase('live');
    } catch (cameraError) {
      if (requestSequenceRef.current !== requestSequence) return;
      releaseStream();
      onSessionChange(false);
      setPhase('idle');
      setError(cameraErrorMessage(cameraError));
    }
  }, [clearCapture, onSessionChange, releaseStream]);

  const cancel = () => {
    closeCamera();
    clearCapture();
    setError(null);
    setPhase('idle');
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setError('A câmera ainda está iniciando. Aguarde um instante e tente novamente.');
      return;
    }

    const dimensions = captureDimensions(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) {
      closeCamera();
      setPhase('idle');
      setError('Não foi possível preparar a foto. Escolha um arquivo para continuar.');
      return;
    }

    context.drawImage(video, 0, 0, dimensions.width, dimensions.height);
    requestSequenceRef.current += 1;
    releaseStream();
    const captureSequence = requestSequenceRef.current;
    setPhase('processing');
    canvas.toBlob(
      (blob) => {
        canvas.width = 1;
        canvas.height = 1;
        if (!mountedRef.current || requestSequenceRef.current !== captureSequence) return;
        if (!blob) {
          onSessionChange(false);
          setPhase('idle');
          setError('Não foi possível gerar a foto. Tente novamente ou escolha um arquivo.');
          return;
        }
        const file = new File([blob], `${label.toLocaleLowerCase('pt-BR')}-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        const previewUrl = URL.createObjectURL(file);
        releasePreview();
        previewUrlRef.current = previewUrl;
        setCaptured({ file, previewUrl, ...dimensions });
        setPhase('captured');
      },
      'image/jpeg',
      DOCUMENT_CAMERA_JPEG_QUALITY,
    );
  };

  const usePhoto = () => {
    if (!captured) return;
    onUsePhoto(captured.file);
    onSessionChange(false);
    clearCapture();
    setPhase('idle');
    setError(null);
  };

  const retake = () => {
    clearCapture();
    void openCamera();
  };

  if (phase === 'idle') {
    return (
      <div className="space-y-2">
        <Button type="button" size="lg" onClick={() => void openCamera()} disabled={disabled}>
          <Camera aria-hidden="true" />
          Tirar foto
        </Button>
        {error ? (
          <p className="text-xs text-destructive-emphasis" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (phase === 'captured' && captured) {
    const resolutionMayBeLow =
      Math.min(captured.width, captured.height) < 720 ||
      Math.max(captured.width, captured.height) < 960;
    return (
      <div className="w-full basis-full space-y-3 rounded-xl border bg-muted/20 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL local e temporária da captura */}
        <img
          src={captured.previewUrl}
          alt={`Prévia da foto de ${label.toLocaleLowerCase('pt-BR')}`}
          className="max-h-[55vh] w-full rounded-lg bg-black object-contain"
        />
        <p className="text-xs text-muted-foreground">
          {captured.width} × {captured.height} pixels · {formatBytes(captured.file.size)}
        </p>
        {resolutionMayBeLow ? (
          <p className="text-xs text-warning-emphasis" role="alert">
            A foto ficou pequena. Aproxime o documento e tire novamente para facilitar a leitura.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={usePhoto}>
            Usar esta foto
          </Button>
          <Button type="button" variant="outline" onClick={retake}>
            <RotateCcw aria-hidden="true" />
            Tirar novamente
          </Button>
          <Button type="button" variant="ghost" onClick={cancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full basis-full space-y-3 rounded-xl border bg-black p-2 text-white">
      {phase === 'live' ? (
        <video
          ref={videoRef}
          id={`${id}-camera-preview`}
          autoPlay
          muted
          playsInline
          className="max-h-[60vh] w-full rounded-lg object-contain"
          aria-label={`Câmera para ${label.toLocaleLowerCase('pt-BR')}`}
        />
      ) : (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          {phase === 'processing' ? 'Preparando foto...' : 'Abrindo câmera...'}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {phase === 'live' ? (
          <Button type="button" onClick={takePhoto}>
            <Camera aria-hidden="true" />
            Tirar foto
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={cancel}>
          <X aria-hidden="true" />
          Cancelar
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
