import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/button';

const links = [
  { href: '/routing', label: 'Visão geral' },
  { href: '/routing/companies', label: 'Clientes' },
  { href: '/routing/fixed-points', label: 'Pontos fixos' },
  { href: '/routing/contracts', label: 'Contratos' },
  { href: '/routing/passengers', label: 'Colaboradores' },
  { href: '/routing/routes', label: 'Rotas sugeridas' },
] as const;

export function RoutingShell({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-primary">Operação por contrato</p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">{description}</p>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Módulo de roteirização">
        {links.map((link) => (
          <Button
            key={link.href}
            render={<Link href={link.href} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            {link.label}
          </Button>
        ))}
      </nav>
      {children}
    </div>
  );
}

export function RoutingEmpty({ children }: { readonly children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
