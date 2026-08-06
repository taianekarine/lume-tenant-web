import Image from 'next/image';

import { cn } from '@/shared/lib/utils';

const LUME_LOCKUP_PATH = '/brand/lume-horizontal-lockup-animated.svg';
const LUME_MARK_PATH = '/brand/lume-sunrise-spark-animated.svg';

export interface LumeBrandMarkProps {
  readonly className?: string;
  readonly decorative?: boolean;
  readonly priority?: boolean;
}

export function LumeBrandMark({
  className,
  decorative = false,
  priority = false,
}: LumeBrandMarkProps) {
  return (
    <Image
      src={LUME_MARK_PATH}
      alt={decorative ? '' : 'Símbolo do Lume'}
      aria-hidden={decorative || undefined}
      width={64}
      height={64}
      priority={priority}
      className={cn('size-10 shrink-0 object-contain', className)}
    />
  );
}

export interface LumeBrandProps {
  readonly className?: string;
  readonly compact?: boolean;
  readonly priority?: boolean;
}

export function LumeBrand({ className, compact = false, priority = false }: LumeBrandProps) {
  return (
    <Image
      data-slot="lume-brand"
      src={LUME_LOCKUP_PATH}
      alt="Lume"
      width={560}
      height={256}
      priority={priority}
      className={cn(
        'shrink-0 object-contain object-left [color-scheme:light] dark:[color-scheme:dark]',
        compact ? 'h-9 w-[5.75rem]' : 'h-24 w-[13rem] sm:w-[15rem]',
        className,
      )}
    />
  );
}
