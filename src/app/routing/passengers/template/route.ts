import { executeAuthenticatedRoutingMutation } from '@/features/routing/server';

export async function GET(request: Request) {
  try {
    const routingCompanyId = new URL(request.url).searchParams.get('routingCompanyId') ?? undefined;
    const file = await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.passengerTemplate(routingCompanyId),
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
