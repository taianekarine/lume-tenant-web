import { cva } from 'class-variance-authority';

export const authenticatedNavigationStyles = {
  list: cva('flex flex-col gap-1'),

  link: cva(
    'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/30',
    {
      variants: {
        active: {
          true: 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm',
          false:
            'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
        },
      },
      defaultVariants: {
        active: false,
      },
    },
  ),

  icon: cva('size-4 shrink-0'),

  label: cva('truncate', {
    variants: {
      collapsed: {
        true: 'md:hidden',
        false: '',
      },
    },
    defaultVariants: { collapsed: false },
  }),

  badge: cva(
    'ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground',
    {
      variants: {
        collapsed: {
          true: 'md:size-2 md:min-w-0 md:p-0 md:text-[0]',
          false: '',
        },
      },
      defaultVariants: { collapsed: false },
    },
  ),
};
