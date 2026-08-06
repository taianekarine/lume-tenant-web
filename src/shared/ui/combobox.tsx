'use client';

import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

const Combobox = ComboboxPrimitive.Root;

function ComboboxInputGroup({ className, ...props }: ComboboxPrimitive.InputGroup.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn(
        'relative flex h-9 w-full min-w-0 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        'h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxTrigger({ className, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      aria-label="Abrir opções"
      className={cn(
        'flex h-full w-9 shrink-0 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      aria-label="Limpar seleção"
      className={cn(
        'flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      <XIcon className="size-3.5" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxContent({
  className,
  children,
  sideOffset = 4,
  ...props
}: ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, 'sideOffset'>) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={sideOffset} className="isolate z-50 outline-none">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            'w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[scale,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        'max-h-[min(22.5rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 scroll-py-1 outline-none data-empty:p-0',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground',
        className,
      )}
      {...props}
    >
      <ComboboxPrimitive.ItemIndicator className="col-start-1">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
      <span className="col-start-2 min-w-0 truncate">{children}</span>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn('px-3 py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
};
