import { cva } from 'class-variance-authority';

export const whatsAppConversationsPageStyles = {
  content: cva('mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8'),

  eyebrow: cva('text-sm font-semibold text-primary-emphasis'),

  title: cva('mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl'),

  description: cva('mt-1 max-w-3xl text-sm leading-5 text-muted-foreground'),
};
