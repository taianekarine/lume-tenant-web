import { cva } from 'class-variance-authority';

export const sectionHeadingStyles = cva(['flex', 'flex-col'], {
  variants: {
    align: {
      left: ['items-start', 'text-left'],
      center: ['items-center', 'text-center'],
    },
  },
  defaultVariants: {
    align: 'left',
  },
});

export const sectionHeadingEyebrowStyles = cva([
  'text-sm',
  'font-semibold',
  'uppercase',
  'tracking-[0.3em]',
  'text-primary',
]);

// export const sectionHeadingTitleStyles = cva([
//   'mt-4',
//   'text-4xl',
//   'font-bold',
//   'tracking-tight',
//   'text-foreground',
//   'lg:text-5xl',
// ]);
export const sectionHeadingTitleStyles = cva([
  'mt-4',
  'text-2xl',
  'font-bold',
  'tracking-tight',
  'text-foreground',
  'sm:text-3xl',
  'lg:text-4xl',
]);

export const sectionHeadingDividerStyles = cva(['mt-8', 'h-px', 'w-48', 'bg-gradient-to-r'], {
  variants: {
    align: {
      left: ['from-primary', 'to-transparent'],
      center: ['from-transparent', 'via-primary', 'to-transparent'],
    },
  },
  defaultVariants: {
    align: 'left',
  },
});

export const sectionHeadingDescriptionStyles = cva([
  'mt-8',
  'max-w-3xl',
  'text-lg',
  'leading-8',
  'text-muted-foreground',
  'pb-8',
]);
