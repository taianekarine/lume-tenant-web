import { Skeleton } from '@/shared/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen bg-sidebar" role="status" aria-label="Carregando aplicação">
      <aside className="hidden w-72 border-r border-sidebar-border bg-sidebar p-4 md:block">
        <div className="flex h-12 items-center gap-3">
          <Skeleton className="size-9" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-background md:m-2 md:ml-0 md:rounded-xl md:ring-1 md:ring-border">
        <header className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="h-8 w-20" />
          </div>
        </header>

        <main className="p-5 sm:p-8">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-9 max-w-lg" />
          <Skeleton className="mt-3 h-4 max-w-2xl" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
          <Skeleton className="mt-6 h-[420px] w-full" />
        </main>
      </div>
      <span className="sr-only">Carregando conteúdo...</span>
    </div>
  );
}
