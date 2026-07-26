import { cva } from 'class-variance-authority';

export const authenticatedNavigationStyles = {
  list: cva('flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1'),

  link: cva(
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/30',
    {
      variants: {
        active: {
          true: 'bg-white text-blue-700 shadow-sm',
          false: 'text-slate-600 hover:bg-white/70 hover:text-slate-950',
        },
      },
      defaultVariants: {
        active: false,
      },
    },
  ),

  icon: cva('size-4'),
};
