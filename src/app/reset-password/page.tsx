import Link from 'next/link';

import { PasswordChangeForm } from '@/features/auth/components';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';

export default async function ResetPasswordPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader />
        <CardContent>
          {token ? (
            <PasswordChangeForm token={token} />
          ) : (
            <div className="space-y-3 text-center">
              <h1 className="text-2xl font-bold">Link inválido</h1>
              <p className="text-sm text-muted-foreground">
                Este link não existe ou expirou. Solicite novas instruções de recuperação.
              </p>
              <Button
                render={<Link href="/forgot-password" />}
                nativeButton={false}
                className="w-full"
              >
                Solicitar novo link
              </Button>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="outline"
                className="w-full"
              >
                Voltar para o login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
