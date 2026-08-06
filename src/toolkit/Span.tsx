import styled, { css } from 'styled-components';
import { HTMLProps } from 'react';
import classNames from 'classnames';
import { TColor, TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';

type SpanProps = {
  color?: TColor;
  bold?: boolean;
  italic?: boolean;
} & HTMLProps<HTMLSpanElement>;
const SpanElement = styled.span`
  ${() =>
    Object.values(ThemeColors).map((color) => {
      return css`
        &.${color} {
          color: ${CSSColor(color, TShade.DEFAULT, 100)};
        }
      `;
    })}
  &.bold {
    font-weight: ${CSSVar('bold')};
  }

  &.italic {
    font-style: italic;
  }
`;
export default function Span({ color, className, bold, italic, children, ...rest }: SpanProps) {
  return (
    <SpanElement
      className={classNames(className, {
        bold,
        italic,
        ...(color ? { [color]: true } : {}),
      })}
      {...rest}
    >
      {children}
    </SpanElement>
  );
}
