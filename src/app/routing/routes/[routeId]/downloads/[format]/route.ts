import { executeAuthenticatedRoutingMutation } from '@/features/routing/server';

const formats = ['pdf', 'xlsx', 'my-maps.xlsx', 'my-maps.csv'] as const;

export async function GET(
  _: Request,
  { params }: { readonly params: Promise<{ routeId: string; format: string }> },
) {
  const { routeId, format } = await params;
  if (!formats.includes(format as (typeof formats)[number]))
    return new Response('Formato inválido.', { status: 404 });
  try {
    const file = await executeAuthenticatedRoutingMutation((gateway) =>
      gateway.downloadRoute(routeId, format as (typeof formats)[number]),
    );
    return new Response(file.content, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Não foi possível exportar a rota aprovada.', { status: 400 });
  }
}
