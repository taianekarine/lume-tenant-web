import { cva } from 'class-variance-authority';

export const authenticatedShellStyles = {
  shell: cva('flex min-h-screen w-full bg-sidebar text-foreground'),

  mobileBackdrop: cva('fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden'),

  sidebar: cva(
    'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[width,transform] duration-200 ease-out md:static md:z-auto md:translate-x-0 md:shadow-none',
    {
      variants: {
        collapsed: {
          true: 'md:w-20',
          false: 'md:w-72',
        },
        mobileOpen: {
          true: 'translate-x-0',
          false: '-translate-x-full md:translate-x-0',
        },
      },
      defaultVariants: {
        collapsed: false,
        mobileOpen: false,
      },
    },
  ),

  sidebarHeader: cva(
    'flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-3',
  ),

  brand: cva(
    'flex min-w-0 items-center gap-3 rounded-lg px-1.5 py-1 font-semibold text-sidebar-foreground outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/30',
  ),

  brandIcon: cva(
    'flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm [&_svg]:size-4',
  ),

  brandText: cva('min-w-0 flex-col', {
    variants: {
      collapsed: {
        true: 'flex md:hidden',
        false: 'flex',
      },
    },
    defaultVariants: { collapsed: false },
  }),

  brandName: cva('truncate text-sm font-bold'),

  brandArea: cva('truncate text-xs font-medium text-muted-foreground'),

  mobileClose: cva('md:hidden'),

  navigation: cva('min-h-0 flex-1 overflow-y-auto px-3 py-4'),

  sidebarFooter: cva('flex items-center gap-3 border-t border-sidebar-border px-4 py-3', {
    variants: {
      collapsed: {
        true: 'md:justify-center md:px-2',
        false: '',
      },
    },
    defaultVariants: { collapsed: false },
  }),

  userAvatar: cva(
    'flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground',
  ),

  userText: cva('min-w-0 flex-1 flex-col', {
    variants: {
      collapsed: {
        true: 'flex md:hidden',
        false: 'flex',
      },
    },
    defaultVariants: { collapsed: false },
  }),

  inset: cva(
    'flex min-h-screen min-w-0 flex-1 flex-col bg-background md:m-2 md:ml-0 md:rounded-xl md:ring-1 md:ring-border',
  ),

  header: cva(
    'sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:rounded-t-xl',
  ),

  headerContent: cva('flex h-16 w-full items-center justify-between gap-3 px-3 sm:px-5'),

  headerLeading: cva('flex min-w-0 items-center gap-1.5'),

  mobileTrigger: cva('md:hidden'),

  desktopTrigger: cva('hidden md:inline-flex'),

  headerDivider: cva('mx-1 h-5 w-px bg-border'),

  pageContext: cva(
    'flex min-w-0 flex-col text-xs text-muted-foreground [&>span]:truncate [&>strong]:truncate [&>strong]:text-sm [&>strong]:font-semibold [&>strong]:text-foreground',
  ),

  headerActions: cva('flex shrink-0 items-center gap-2'),

  content: cva('min-w-0 flex-1'),
};
