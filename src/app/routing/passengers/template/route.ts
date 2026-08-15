import { executeAuthenticatedRoutingMutation } from '@/features/routing/server';

export async function GET() {
  try {
    const file = await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.passengerTemplate(),
    );
    return new Response(file.content, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Não foi possível baixar o modelo.', { status: 401 });
  }
}
