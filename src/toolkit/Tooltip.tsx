import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { Fragment, HTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import styled from 'styled-components';
import Tag, { TTagSize, TTagVariant } from './Tag';

type TooltipProps = PropsWithChildren<{
  label?: ReactNode | string;
  /** Plain-text description for assistive tech. Radix always renders an extra visually-hidden copy
   * of `label` for screen readers (see @radix-ui/react-tooltip) — passing this avoids mounting
   * `label` a second time, which matters when `label` carries side effects (e.g. a mounted widget). */
  ariaLabel?: string;
  align?: 'center' | 'end' | 'start';
  show?: boolean;
  forceOpen?: boolean;
  delay?: number;
  sideOffset?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
}>;

const Content = styled(TooltipPrimitive.Content)`
  z-index: 1000;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('tooltipFontSize')};
  border-radius: ${CSSVar('tooltipBorderRadius')};
  background: ${CSSVar('tooltipBg')};
  backdrop-filter: ${CSSVar('tooltipBackdropFilter')};
  color: ${CSSVar('tooltipColor')};
  line-height: 120%;
`;

const Arrow = styled(TooltipPrimitive.Arrow)`
  fill: ${CSSVar('tooltipArrowColor')};
`;

const TooltipRoot = styled.div`
  display: flex;
  flex-direction: column;
  color: ${CSSVar('tooltipColor')};
  gap: ${CSSVar('tooltipSpacingInnerY')};
  padding: ${CSSVar('tooltipSpacingY')} ${CSSVar('tooltipSpacingX')};
`;

const TooltipTitle = styled.div`
  font-size: ${CSSVar('tooltipTitleFontSize')};
  line-height: 1.28;
  padding: 0 0 ${CSSVar('tooltipSpacingInnerY')};
  white-space: pre-line;
  text-align: center;
`;

const TooltipContent = styled.div`
  font-size: ${CSSVar('tooltipFontSize')};
  line-height: 1.2;
  white-space: pre-line;
`;

type ComplexTooltipContentProps = {
  title: ReactNode | string;
} & HTMLAttributes<HTMLDivElement>;

export const TooltipComplex = ({ title, children, ...rest }: ComplexTooltipContentProps) => {
  return (
    <TooltipRoot {...rest}>
      {title && <TooltipTitle>{title}</TooltipTitle>}
      {children && <TooltipContent>{children}</TooltipContent>}
    </TooltipRoot>
  );
};
export const TooltipSimple = ({ children }: PropsWithChildren) => {
  return (
    <TooltipRoot>
      <TooltipContent>{children}</TooltipContent>
    </TooltipRoot>
  );
};

const KeystrokeHint = styled.div`
  text-align: center;
`;

type TooltipKeystrokeHintProps = {
  keys: ReactNode[];
  size?: TTagSize;
};

export const TooltipKeystrokeHint = ({ keys, size = TTagSize.NANO }: TooltipKeystrokeHintProps) => {
  return (
    <KeystrokeHint>
      {keys.map((key, index) => (
        <Fragment key={index}>
          {index > 0 && ' + '}
          <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={size}>
            {key}
          </Tag>
        </Fragment>
      ))}
    </KeystrokeHint>
  );
};

export default function Tooltip({
  children,
  label,
  ariaLabel,
  show = true,
  forceOpen,
  delay = 0,
  align = 'center',
  side = 'top',
  sideOffset = 8,
}: TooltipProps) {
  if (!show) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root open={typeof forceOpen === 'boolean' ? forceOpen : undefined}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <Content side={side} align={align} sideOffset={sideOffset} aria-label={ariaLabel}>
            {label}
            <Arrow width={8} height={4} />
          </Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
