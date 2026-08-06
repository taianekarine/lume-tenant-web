'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/shared/ui/button';

export default function UsersError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center p-6">
      <section
        role="alert"
        className="w-full rounded-2xl border border-destructive/20 bg-card p-8 text-center"
      >
        <AlertTriangle className="mx-auto size-10 text-destructive-emphasis" />
        <h1 className="mt-4 text-2xl font-bold">Não foi possível carregar os usuários</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'Não foi possível carregar os usuários.'}
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RotateCcw />
          Tentar novamente
        </Button>
      </section>
    </main>
  );
}
