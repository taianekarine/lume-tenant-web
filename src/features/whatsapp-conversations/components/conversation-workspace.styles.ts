import { cva } from 'class-variance-authority';

export const conversationWorkspaceStyles = {
  section: cva(
    'mt-6 grid min-h-[760px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 xl:grid-cols-[400px_1fr]',
  ),
  visuallyHidden: cva('sr-only'),
  sidebar: cva('flex min-h-0 flex-col border-b border-slate-200 xl:border-r xl:border-b-0'),
  sidebarHeader: cva('border-b border-slate-200 p-5'),
  sidebarHeading: cva('flex items-start justify-between gap-3'),
  sidebarEyebrow: cva('text-xs font-semibold uppercase tracking-wider text-emerald-700'),
  sidebarTitle: cva('mt-1 text-lg font-bold text-slate-950'),
  refreshButton: cva(
    'inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 [&_svg]:size-3.5',
  ),
  errorBanner: cva(
    'mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200 [&>svg]:size-4 [&>button]:font-bold [&>button]:underline',
  ),
  searchContainer: cva('relative mt-4'),
  searchIcon: cva(
    'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400',
  ),
  searchInput: cva(
    'h-10 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15',
  ),
  filters: cva('mt-4 grid grid-cols-2 gap-3'),
  wideFilter: cva('col-span-2'),
  filterLabel: cva('block text-xs font-semibold text-slate-600'),
  filterSelect: cva(
    'mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15',
  ),
  conversationList: cva('max-h-[660px] flex-1 overflow-y-auto xl:max-h-none'),
  conversationButton: cva(
    'flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 focus-visible:ring-3 focus-visible:ring-emerald-600/20 focus-visible:ring-inset focus-visible:outline-none',
    {
      variants: {
        selected: {
          true: 'bg-emerald-50/70 hover:bg-emerald-50',
          false: 'bg-white',
        },
      },
      defaultVariants: { selected: false },
    },
  ),
  avatar: cva(
    'flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800',
  ),
  conversationSummary: cva('min-w-0 flex-1'),
  conversationHeading: cva('flex items-center justify-between gap-2'),
  contactName: cva('truncate text-sm font-bold text-slate-950'),
  conversationTime: cva('shrink-0 text-[10px] text-slate-400'),
  phonePreview: cva('mt-0.5 block text-[11px] text-slate-500'),
  previewRow: cva('mt-1.5 flex items-center gap-2'),
  preview: cva('min-w-0 flex-1 truncate text-xs leading-5 text-slate-600'),
  unreadBadge: cva(
    'flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white',
  ),
  listMetadata: cva('mt-2.5 flex flex-wrap gap-1.5'),
  departmentBadge: cva(
    'inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700',
  ),
  controlBadge: cva('inline-flex rounded-full px-2 py-1 text-[10px] font-semibold', {
    variants: {
      control: {
        bot: 'bg-emerald-100 text-emerald-800',
        human: 'bg-blue-100 text-blue-800',
        paused: 'bg-amber-100 text-amber-800',
        closed: 'bg-slate-200 text-slate-700',
      },
    },
  }),
  requestBadge: cva('inline-flex rounded-full px-2 py-1 text-[10px] font-semibold', {
    variants: {
      tone: {
        neutral: 'bg-slate-100 text-slate-700',
        progress: 'bg-blue-100 text-blue-800',
        waiting: 'bg-amber-100 text-amber-800',
        success: 'bg-emerald-100 text-emerald-800',
        danger: 'bg-red-100 text-red-800',
      },
    },
  }),
  emptyList: cva('flex flex-col items-center px-6 py-14 text-center'),
  emptyIcon: cva('size-8 text-slate-300'),
  emptyTitle: cva('mt-3 text-sm font-bold text-slate-800'),
  emptyDescription: cva('mt-1 text-xs leading-5 text-slate-500'),
  detail: cva('flex min-h-[680px] min-w-0 flex-col bg-slate-50/70'),
  detailHeader: cva(
    'flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between',
  ),
  contactBlock: cva('flex min-w-0 items-center gap-3'),
  detailAvatar: cva(
    'flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white',
  ),
  detailTitle: cva('truncate text-base font-bold text-slate-950'),
  phone: cva('mt-1 flex items-center gap-1.5 text-xs text-slate-500 [&_svg]:size-3.5'),
  lastInteraction: cva('mt-1 text-[11px] text-slate-400'),
  versionBadge: cva(
    'w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600',
  ),
  highlightGrid: cva('grid gap-3 border-b border-slate-200 bg-white p-4 lg:grid-cols-3'),
  highlight: cva(
    'flex items-start gap-2.5 rounded-xl px-3 py-3 ring-1 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&_strong]:block [&_strong]:text-xs [&_small]:mt-1 [&_small]:block [&_small]:text-[11px] [&_small]:leading-4',
    {
      variants: {
        tone: {
          success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
          danger: 'bg-red-50 text-red-900 ring-red-200',
          info: 'bg-blue-50 text-blue-900 ring-blue-200',
          warning: 'bg-amber-50 text-amber-900 ring-amber-200',
          neutral: 'bg-slate-50 text-slate-700 ring-slate-200',
        },
      },
    },
  ),
  dimensionGrid: cva(
    'grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-2 2xl:grid-cols-4',
  ),
  dimensionItem: cva(
    'flex min-w-0 items-start gap-2.5 bg-white px-4 py-3 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-emerald-600 [&_small]:block [&_small]:text-[10px] [&_small]:font-semibold [&_small]:uppercase [&_small]:tracking-wide [&_small]:text-slate-400 [&_strong]:mt-0.5 [&_strong]:block [&_strong]:text-xs [&_strong]:leading-5 [&_strong]:text-slate-800',
  ),
  assignment: cva(
    'flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 text-xs text-slate-600 [&>svg]:size-4 [&>svg]:text-slate-400 [&>small]:ml-auto [&>small]:text-slate-400',
  ),
  actionsPanel: cva('border-b border-slate-200 bg-white px-5 py-4'),
  actionsTitle: cva('text-xs font-bold uppercase tracking-wide text-slate-500'),
  actions: cva('mt-3 flex flex-wrap gap-2'),
  actionButton: cva(
    'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4',
    {
      variants: {
        action: {
          human: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200 hover:bg-blue-100',
          bot: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100',
          read: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100',
          forward: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100',
        },
      },
    },
  ),
  forwardRow: cva(
    'mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 [&>label]:w-full [&>label]:text-xs [&>label]:font-semibold [&>label]:text-slate-600 sm:[&>label]:w-auto sm:[&>label]:self-center',
  ),
  compactSelect: cva(
    'h-9 min-w-52 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none focus:border-emerald-600 disabled:opacity-50',
  ),
  unavailableActions: cva(
    'mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 [&>button]:inline-flex [&>button]:cursor-not-allowed [&>button]:items-center [&>button]:gap-1.5 [&>button]:rounded-lg [&>button]:bg-slate-100 [&>button]:px-2.5 [&>button]:py-1.5 [&>button]:opacity-60 [&>button_svg]:size-3.5',
  ),
  quotePanel: cva('border-b border-slate-200 bg-white px-5 py-5'),
  panelHeading: cva(
    'flex flex-wrap items-start justify-between gap-3 [&_h4]:mt-1 [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-slate-900',
  ),
  panelEyebrow: cva('text-[10px] font-bold uppercase tracking-wider text-emerald-700'),
  confirmedBadge: cva(
    'inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 [&_svg]:size-3.5',
  ),
  quoteGrid: cva(
    'mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 [&>div]:min-w-0 [&_dt]:text-[10px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-wide [&_dt]:text-slate-400 [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-xs [&_dd]:leading-5 [&_dd]:text-slate-700',
  ),
  structuredData: cva(
    'mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200 [&>strong]:text-slate-900 [&>dl]:mt-2 [&>dl]:grid [&>dl]:gap-2 sm:[&>dl]:grid-cols-2 [&_dt]:font-semibold [&_dd]:break-words',
  ),
  emptyPanelText: cva('px-5 py-8 text-center text-xs leading-5 text-slate-500'),
  auditPanel: cva(
    'border-b border-slate-200 bg-slate-50 px-5 py-4 [&_h4]:mt-1 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-slate-900 [&>dl]:mt-3 [&>dl]:grid [&>dl]:gap-3 sm:[&>dl]:grid-cols-2 lg:[&>dl]:grid-cols-5 [&_dt]:text-[10px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-slate-400 [&_dd]:mt-1 [&_dd]:text-xs [&_dd]:text-slate-700 [&>p]:mt-3 [&>p]:text-[11px] [&>p]:leading-5 [&>p]:text-slate-500',
  ),
  transitionList: cva(
    'mt-4 grid gap-2 lg:grid-cols-2 [&>li]:rounded-xl [&>li]:bg-white [&>li]:p-3 [&>li]:ring-1 [&>li]:ring-slate-200 [&>li>div]:flex [&>li>div]:items-center [&>li>div]:justify-between [&>li>div]:gap-2 [&_strong]:text-xs [&_strong]:text-slate-800 [&_span]:text-[10px] [&_span]:font-semibold [&_span]:text-slate-400 [&_p]:mt-1.5 [&_p]:text-[11px] [&_p]:leading-4 [&_p]:text-slate-600 [&_small]:mt-1 [&_small]:block [&_small]:break-all [&_small]:text-[10px] [&_small]:text-slate-400',
  ),
  history: cva('flex min-h-72 flex-col bg-slate-50/70'),
  historyHeader: cva(
    'flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 [&_h4]:mt-1 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-slate-900 [&>span]:text-xs [&>span]:font-semibold [&>span]:text-slate-500',
  ),
  loadingState: cva(
    'flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500 [&_svg]:size-5 [&_svg]:animate-spin',
  ),
  detailError: cva(
    'm-5 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-red-50 p-4 text-xs text-red-800 ring-1 ring-red-200 [&>svg]:size-4 [&>button]:font-bold [&>button]:underline',
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
        inbound: 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200',
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
    'mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] leading-4 text-red-800 [&>svg]:mt-0.5 [&>svg]:size-3.5 [&>svg]:shrink-0',
  ),
  messageTime: cva('mt-1.5 block text-right text-[10px] opacity-65'),
  composer: cva('border-t border-slate-200 bg-white px-5 py-5'),
  composerHeading: cva(
    'flex flex-wrap items-start justify-between gap-3 [&_h4]:mt-1 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-slate-900',
  ),
  composerStatus: cva('rounded-full px-3 py-1 text-[11px] font-bold', {
    variants: {
      enabled: {
        true: 'bg-emerald-100 text-emerald-800',
        false: 'bg-slate-100 text-slate-500',
      },
    },
  }),
  composerInput: cva(
    'mt-4 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
  ),
  composerFooter: cva(
    'mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between [&>p]:text-[11px] [&>p]:leading-5 [&>p]:text-slate-500',
  ),
  sendButton: cva(
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 focus-visible:ring-3 focus-visible:ring-emerald-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300 [&_svg]:size-4 [&_svg]:shrink-0 disabled:[&_svg]:opacity-70',
  ),
  detailFooter: cva('border-t border-slate-200 bg-white px-5 py-4'),
  integrationNotice: cva(
    'flex items-start gap-2 text-xs leading-5 text-slate-500 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-emerald-600',
  ),
  feedback: cva('mt-2 min-h-5 text-xs font-semibold', {
    variants: {
      tone: {
        neutral: 'text-slate-600',
        success: 'text-emerald-700',
        error: 'text-red-700',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }),
  emptyDetail: cva('flex flex-1 flex-col items-center justify-center px-6 text-center'),
  emptyDetailIcon: cva('size-12 text-slate-300'),
  emptyDetailTitle: cva('mt-4 text-base font-bold text-slate-800'),
  emptyDetailDescription: cva('mt-2 max-w-sm text-sm leading-6 text-slate-500'),
};
