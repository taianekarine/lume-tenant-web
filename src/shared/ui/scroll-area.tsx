'use client';

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@/shared/lib/utils';

function ScrollArea({
  className,
  contentClassName,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  readonly contentClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="h-full max-h-[inherit] w-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content" className={contentClassName}>
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'pointer-events-none z-10 flex touch-none p-px opacity-0 transition-opacity duration-150 select-none data-hovering:pointer-events-auto data-hovering:opacity-100 data-scrolling:pointer-events-auto data-scrolling:opacity-100',
        orientation === 'vertical' && 'h-full w-2.5 justify-center',
        orientation === 'horizontal' && 'h-2.5 flex-col justify-center',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          'relative flex-1 rounded-full bg-border',
          orientation === 'vertical' && 'w-full',
          orientation === 'horizontal' && 'h-full',
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
