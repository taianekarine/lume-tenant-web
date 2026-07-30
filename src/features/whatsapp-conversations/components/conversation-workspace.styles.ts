import { cva } from 'class-variance-authority';

export const conversationWorkspaceStyles = {
  section: cva(
    'mt-4 grid min-h-[36rem] overflow-hidden rounded-2xl bg-card text-card-foreground shadow-sm ring-1 ring-border xl:h-[calc(100dvh-15rem)] xl:grid-cols-[400px_1fr]',
  ),
  visuallyHidden: cva('sr-only'),
  sidebar: cva('flex min-h-0 flex-col border-b border-border xl:border-r xl:border-b-0'),
  sidebarHeader: cva('border-b border-border p-5'),
  sidebarHeading: cva('flex items-start justify-between gap-3'),
  sidebarEyebrow: cva('text-xs font-semibold uppercase tracking-wider text-emerald-700'),
  sidebarTitle: cva('mt-1 text-lg font-bold text-foreground'),
  refreshButton: cva(
    'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-50 [&_svg]:size-3.5',
  ),
  errorBanner: cva(
    'mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900 [&>svg]:size-4 [&>button]:font-bold [&>button]:underline',
  ),
  searchContainer: cva('relative mt-4'),
  searchIcon: cva(
    'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground',
  ),
  searchInput: cva(
    'h-10 w-full rounded-xl border border-input bg-background pr-3 pl-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15',
  ),
  filters: cva('mt-4 grid grid-cols-2 gap-3'),
  wideFilter: cva('col-span-2'),
  filterLabel: cva('block text-xs font-semibold text-muted-foreground'),
  filterSelect: cva(
    'mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15',
  ),
  conversationList: cva('min-h-0 flex-1 overflow-y-auto'),
  conversationButton: cva(
    'flex w-full gap-3 border-b border-border px-4 py-4 text-left transition hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-emerald-600/20 focus-visible:ring-inset focus-visible:outline-none',
    {
      variants: {
        selected: {
          true: 'bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/50',
          false: 'bg-card',
        },
      },
      defaultVariants: { selected: false },
    },
  ),
  avatar: cva(
    'flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  ),
  conversationSummary: cva('min-w-0 flex-1'),
  conversationHeading: cva('flex items-center justify-between gap-2'),
  contactName: cva('truncate text-sm font-bold text-foreground'),
  conversationTime: cva('shrink-0 text-[10px] text-muted-foreground'),
  phonePreview: cva('mt-0.5 block text-[11px] text-muted-foreground'),
  previewRow: cva('mt-1.5 flex items-center gap-2'),
  preview: cva('min-w-0 flex-1 truncate text-xs leading-5 text-muted-foreground'),
  unreadBadge: cva(
    'flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white',
  ),
  listMetadata: cva('mt-2.5 flex flex-wrap gap-1.5'),
  departmentBadge: cva(
    'inline-flex rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground',
  ),
  controlBadge: cva('inline-flex rounded-full px-2 py-1 text-[10px] font-semibold', {
    variants: {
      control: {
        bot: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        human: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
        paused: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
        closed: 'bg-muted text-muted-foreground',
      },
    },
  }),
  requestBadge: cva('inline-flex rounded-full px-2 py-1 text-[10px] font-semibold', {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        progress: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
        waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      },
    },
  }),
  emptyList: cva('flex flex-col items-center px-6 py-14 text-center'),
  emptyIcon: cva('size-8 text-muted-foreground/40'),
  emptyTitle: cva('mt-3 text-sm font-bold text-foreground'),
  emptyDescription: cva('mt-1 text-xs leading-5 text-muted-foreground'),
  detail: cva('flex min-h-0 min-w-0 flex-col overflow-hidden bg-muted/20'),
  detailHeader: cva(
    'flex flex-wrap items-center justify-between gap-3 border-b border-border bg-emerald-50/70 px-4 py-2 dark:bg-emerald-950/25',
  ),
  contactBlock: cva('flex min-w-0 items-center gap-3'),
  contactIdentity: cva('flex min-w-0 flex-1 flex-col items-start gap-0.5'),
  detailAvatar: cva(
    'flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white',
  ),
  detailTitle: cva('shrink-0 text-sm font-bold text-foreground'),
  phone: cva('flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5'),
  lastInteraction: cva('min-w-0 text-[11px] text-muted-foreground'),
  headerAssignment: cva(
    'flex items-center gap-2 rounded-lg bg-background/80 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border [&>svg]:size-4',
  ),
  versionBadge: cva(
    'w-fit rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground',
  ),
  highlightGrid: cva('grid gap-2 border-b border-border bg-card p-3 lg:grid-cols-3'),
  highlight: cva(
    'flex min-w-0 items-start gap-2.5 rounded-xl px-3 py-2 ring-1 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&_span]:min-w-0 [&_strong]:block [&_strong]:whitespace-nowrap [&_strong]:text-[11px] [&_small]:mt-0.5 [&_small]:block [&_small]:text-[11px] [&_small]:leading-4',
    {
      variants: {
        tone: {
          success:
            'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-900',
          danger:
            'bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/50 dark:text-red-100 dark:ring-red-900',
          info: 'bg-blue-50 text-blue-900 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-100 dark:ring-blue-900',
          warning:
            'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-900',
          neutral: 'bg-muted/50 text-muted-foreground ring-border',
        },
      },
    },
  ),
  dimensionGrid: cva('grid gap-px border-b border-border bg-border sm:grid-cols-2 xl:grid-cols-5'),
  dimensionItem: cva(
    'flex min-w-0 items-start gap-2 bg-card px-3 py-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-emerald-600 [&_small]:block [&_small]:text-[9px] [&_small]:font-semibold [&_small]:uppercase [&_small]:tracking-wide [&_small]:text-muted-foreground [&_strong]:mt-0.5 [&_strong]:block [&_strong]:text-[11px] [&_strong]:leading-4 [&_strong]:text-foreground',
  ),
  assignment: cva(
    'flex flex-wrap items-center gap-2 border-b border-border bg-card px-5 py-2.5 text-xs text-muted-foreground [&>svg]:size-4 [&>svg]:text-muted-foreground [&>small]:ml-auto [&>small]:text-muted-foreground',
  ),
  actionsPanel: cva('border-b border-border bg-card px-4 py-3'),
  actionsTitle: cva('text-xs font-bold uppercase tracking-wide text-muted-foreground'),
  actionColumns: cva('mt-2 grid gap-2 lg:grid-cols-2 lg:[&>div:last-child]:justify-end'),
  actions: cva('flex flex-wrap gap-2'),
  actionButton: cva(
    'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4',
    {
      variants: {
        action: {
          human:
            'bg-blue-50 text-blue-800 ring-1 ring-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900 dark:hover:bg-blue-950',
          bot: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900 dark:hover:bg-emerald-950',
          read: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900 dark:hover:bg-violet-950',
          forward:
            'bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900 dark:hover:bg-amber-950',
          close:
            'bg-red-50 text-red-800 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900 dark:hover:bg-red-950',
        },
      },
    },
  ),
  forwardRow: cva(
    'mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 ring-1 ring-border [&>label]:w-full [&>label]:text-xs [&>label]:font-semibold [&>label]:text-muted-foreground sm:[&>label]:w-auto',
  ),
  compactSelect: cva(
    'h-9 min-w-52 rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-emerald-600 disabled:opacity-50',
  ),
  unavailableActions: cva(
    'mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground [&>button]:inline-flex [&>button]:cursor-not-allowed [&>button]:items-center [&>button]:gap-1.5 [&>button]:rounded-lg [&>button]:bg-muted [&>button]:px-2.5 [&>button]:py-1.5 [&>button]:opacity-60 [&>button_svg]:size-3.5',
  ),
  quotePanel: cva('border-b border-border bg-card px-4 py-3'),
  panelHeading: cva(
    'flex flex-wrap items-start justify-between gap-3 [&_h4]:mt-1 [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-foreground',
  ),
  panelEyebrow: cva('text-[10px] font-bold uppercase tracking-wider text-emerald-700'),
  quoteActions: cva('flex flex-wrap items-center justify-end gap-2'),
  confirmedBadge: cva(
    'inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 [&_svg]:size-3.5',
  ),
  quoteGrid: cva(
    'mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 [&>div]:min-w-0 [&_dt]:text-[10px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-xs [&_dd]:leading-5 [&_dd]:text-foreground',
  ),
  emptyPanelText: cva('px-5 py-8 text-center text-xs leading-5 text-muted-foreground'),
  closureHistory: cva('border-b border-border bg-card px-5 py-5'),
  closureHistoryHeading: cva(
    'flex items-start gap-2.5 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:text-emerald-600 [&_h4]:mt-1 [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-foreground',
  ),
  closureHistoryList: cva('mt-4 grid gap-3'),
  closureHistoryItem: cva(
    'rounded-xl border border-border bg-muted/30 p-4 [&_dl]:grid [&_dl]:gap-3 sm:[&_dl]:grid-cols-3 [&_dt]:text-[10px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-xs [&_dd]:leading-5 [&_dd]:text-foreground',
  ),
  history: cva('flex min-h-72 flex-col bg-muted/20'),
  historyHeader: cva(
    'flex items-start justify-between border-b border-border bg-card px-5 py-4 [&_h4]:mt-1 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-foreground [&>span]:text-xs [&>span]:font-semibold [&>span]:text-muted-foreground',
  ),
  historySkeleton: cva('flex min-h-52 flex-col gap-4 p-5 sm:p-7'),
  detailError: cva(
    'm-5 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-red-50 p-4 text-xs text-red-800 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900 [&>svg]:size-4 [&>button]:font-bold [&>button]:underline',
  ),
  messages: cva('flex max-h-[560px] flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-7'),
  messageRow: cva('flex', {
    variants: {
      direction: {
        inbound: 'justify-start',
        outbound: 'justify-end',
      },
    },
  }),
  messageBubble: cva('max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[75%]', {
    variants: {
      direction: {
        inbound: 'rounded-bl-md bg-card text-card-foreground ring-1 ring-border',
        outbound: 'rounded-br-md bg-emerald-600 text-white',
      },
    },
  }),
  messageMeta: cva(
    'flex flex-wrap items-center justify-between gap-2 text-[10px] opacity-75 [&>strong]:text-xs',
  ),
  messageContent: cva('mt-1 whitespace-pre-wrap break-words leading-6'),
  attachment: cva(
    'mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-black/5 p-2.5 text-xs [&>svg]:size-4 [&>span]:min-w-0 [&>span]:flex-1 [&_strong]:block [&_strong]:truncate [&_small]:mt-0.5 [&_small]:block [&_small]:opacity-75 [&>a]:font-bold [&>a]:underline',
  ),
  failureReason: cva(
    'mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] leading-4 text-red-800 dark:bg-red-950/50 dark:text-red-200 [&>svg]:mt-0.5 [&>svg]:size-3.5 [&>svg]:shrink-0',
  ),
  messageTime: cva('mt-1.5 block text-right text-[10px] opacity-65'),
  composer: cva('border-t border-border bg-card px-5 py-5'),
  composerHeading: cva(
    'flex flex-wrap items-start justify-between gap-3 [&_h4]:mt-1 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-foreground',
  ),
  composerStatus: cva('rounded-full px-3 py-1 text-[11px] font-bold', {
    variants: {
      enabled: {
        true: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        false: 'bg-muted text-muted-foreground',
      },
    },
  }),
  composerInput: cva(
    'mt-4 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground dark:focus:ring-emerald-950',
  ),
  composerFooter: cva(
    'mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between [&>p]:text-[11px] [&>p]:leading-5 [&>p]:text-muted-foreground',
  ),
  sendButton: cva(
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 focus-visible:ring-3 focus-visible:ring-emerald-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0 disabled:[&_svg]:opacity-70',
  ),
  detailFooter: cva('mt-auto border-t border-border bg-card px-4 py-2'),
  integrationNotice: cva(
    'flex items-start gap-2 text-xs leading-5 text-muted-foreground [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-emerald-600',
  ),
  feedback: cva('mt-2 min-h-5 text-xs font-semibold', {
    variants: {
      tone: {
        neutral: 'text-muted-foreground',
        success: 'text-emerald-700',
        error: 'text-red-700',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }),
  emptyDetail: cva('flex flex-1 flex-col items-center justify-center px-6 text-center'),
  emptyDetailIcon: cva('size-12 text-muted-foreground/40'),
  emptyDetailTitle: cva('mt-4 text-base font-bold text-foreground'),
  emptyDetailDescription: cva('mt-2 max-w-sm text-sm leading-6 text-muted-foreground'),
};
