import type { VariantProps } from 'class-variance-authority';

import {
  sectionHeadingDescriptionStyles,
  sectionHeadingDividerStyles,
  sectionHeadingEyebrowStyles,
  sectionHeadingStyles,
  sectionHeadingTitleStyles,
} from './styles';

interface SectionHeadingProps extends VariantProps<typeof sectionHeadingStyles> {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div className={sectionHeadingStyles({ align })}>
      <p className={sectionHeadingEyebrowStyles()}>{eyebrow}</p>

      <h2 className={sectionHeadingTitleStyles()}>{title}</h2>

      <div className={sectionHeadingDividerStyles({ align })} aria-hidden="true" />

      {description ? <p className={sectionHeadingDescriptionStyles()}>{description}</p> : null}
    </div>
  );
}
