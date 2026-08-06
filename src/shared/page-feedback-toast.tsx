'use client';

import { useEffect } from 'react';

import { toast } from '@/shared/ui/toast';
import { userFacingMessage } from '@/shared/lib/user-facing-message';

export function PageFeedbackToast({
  error,
  success,
}: {
  readonly error?: string | readonly string[];
  readonly success?: string;
}) {
  useEffect(() => {
    const errors = typeof error === 'string' ? [error] : (error ?? []);
    if (errors.length > 0) {
      toast.add({
        title: errors.length === 1 ? 'Operação não concluída' : 'Alguns dados não foram carregados',
        description: errors
          .map((message) => userFacingMessage(message, 'Não foi possível concluir a operação.'))
          .join(' '),
        type: 'error',
      });
      return;
    }
    if (success) {
      toast.add({ title: 'Operação concluída', description: success, type: 'success' });
    }
  }, [error, success]);

  return null;
}
