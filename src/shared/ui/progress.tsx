'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@/shared/lib/utils';

function Progress({ className, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn('w-full', className)} {...props}>
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="h-2 w-full overflow-hidden rounded-full bg-primary/15"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
