import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { HTMLAttributes, JSX, PropsWithChildren } from 'react';
import styled from 'styled-components';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HProps = PropsWithChildren<{
  level?: HeadingLevel;
}> &
  Omit<HTMLAttributes<HTMLHeadingElement>, 'children'>;

const Root = styled.div`
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 100)};

  &[data-level='1'] {
    font-family: ${CSSVar('fontHeadingSansSerif')};
    font-size: ${CSSVar('sizeH1')};
    font-weight: ${CSSVar('weightH1')};
    position: relative;
    white-space: nowrap;
    line-height: 120%;
    font-style: normal;
    letter-spacing: -0.25rem;
    text-transform: uppercase;
    margin: 0;
  }

  &[data-level='2'] {
    font-family: ${CSSVar('fontHeadingSansSerif')};
    font-size: ${CSSVar('sizeH2')};
    font-weight: ${CSSVar('weightH2')};
    line-height: 1.28;
    letter-spacing: -0.25rem;
    text-transform: uppercase;
  }

  &[data-level='3'] {
    font-family: ${CSSVar('fontHeadingSansSerif')};
    font-size: ${CSSVar('sizeH3')};
    font-weight: ${CSSVar('weightH3')};
    line-height: 1.28;
    text-transform: uppercase;
  }

  &[data-level='4'] {
    font-family: ${CSSVar('fontHeadingSansSerif')};
    font-size: ${CSSVar('sizeH4')};
    font-weight: ${CSSVar('weightH4')};
    line-height: 1.28;
    text-transform: uppercase;
  }

  &[data-level='5'] {
    font-family: ${CSSVar('fontHeadingSansSerif')};
    font-size: ${CSSVar('sizeH5')};
    font-weight: ${CSSVar('weightH5')};
    text-transform: uppercase;
    letter-spacing: -0.01rem;
  }

  &[data-level='6'] {
    font-family: ${CSSVar('fontHeadingSansSerif')};
    font-size: ${CSSVar('sizeH6')};
    font-weight: ${CSSVar('weightH6')};
    text-transform: uppercase;
    letter-spacing: -0.01rem;
  }
`;

export default function H({ level = 1, children, ...props }: HProps) {
  const headingTag = `h${level}` as keyof Pick<
    JSX.IntrinsicElements,
    'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  >;
  return (
    <Root as={headingTag} data-level={level} {...props}>
      {children}
    </Root>
  );
}
