import { HTMLProps } from 'react';
import styled, { css } from 'styled-components';
import classNames from 'classnames';
import { TColor, TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';

export enum TPStyle {
  DEFAULT = 'default',
  SERIF = 'serif',
}

export enum TPVariant {
  DEFAULT = 'default',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
}

type PProps = {
  type?: TPStyle;
  color?: TColor;
  variant?: TPVariant;
} & HTMLProps<HTMLParagraphElement>;

const Paragraph = styled.div<{ $variant: TPVariant; $color: TColor }>`
  ${Object.values(TPStyle).map(
    (type) => css`
      &.${type} {
        font-family: ${() =>
          type === TPStyle.SERIF ? CSSVar('fontTextSerif') : CSSVar('fontTextSansSerif')};
      }
    `
  )}
  color: ${({ $variant, $color }) =>
    `${$variant === TPVariant.DEFAULT ? CSSColor($color, TShade.DEFAULT, 100) : CSSColor($color, TShade.DEFAULT, $variant === TPVariant.SECONDARY ? 80 : 60)};`}
    font-size: ${CSSVar('sizeTextRegular')};
  font-weight: ${CSSVar('weightTextRegular')};
  line-height: calc(${CSSVar('sizeTextRegular')} * 1.28);
  margin: 0;
`;
export default function P({
  children,
  color = ThemeColors.TEXT,
  type = TPStyle.DEFAULT,
  variant = TPVariant.DEFAULT,
  className,
  ...rest
}: PProps) {
  return (
    <Paragraph
      $variant={variant}
      $color={color}
      role={'paragraph'}
      className={classNames(className, { [type]: true, ...(color ? { [color]: true } : {}) })}
      {...rest}
    >
      {children}
    </Paragraph>
  );
}
