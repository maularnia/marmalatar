import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import { TColor, TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import classNames from 'classnames';
import { CSSProperties, HTMLAttributes } from 'react';
import styled from 'styled-components';
import Icon from './Icon/Icon';
import { TIconSize, TIcon } from './Icon/icons';

export enum TMessageVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
}

export enum TMessageSize {
  XS = 'xs',
  S = 's',
  M = 'm',
  L = 'l',
}

const MessageSizeToIconSize = new Map<TMessageSize, TIconSize>([
  [TMessageSize.S, TIconSize.L],
  [TMessageSize.M, TIconSize.XL],
  [TMessageSize.L, TIconSize.S],
]);

export type TMessageProps = {
  type?: TMessageVariant;
  size?: TMessageSize;
  color?: TColor;
  icon?: TIcon;
} & HTMLAttributes<HTMLDivElement>;

const MessageIconContainer = styled.div`
  border-radius: 50%;
  line-height: 0;
  flex-shrink: 0;
  flex-grow: 0;
`;

const MessageContent = styled.div`
  white-space: pre-line;
`;

const Root = styled.div.attrs<{ $color: TColor; $theme: TTheme }>(({ $color, $theme }) => ({
  style: {
    '--message-color': CSSColor($color, TShade.DEFAULT, 100),
    '--message-color-semitransparent': CSSColor($color, TShade.DEFAULT, 5),
    '--message-color-light': CSSColor($color, TShade.DEFAULT, 5),
    '--message-secondary-border-color': CSSColor($color, TShade.DEFAULT, 10),
    '--message-ternary-border-color': CSSColor($color, TShade.DEFAULT, 10),
    '--text-color-ternary': CSSColor($color, TShade.DEFAULT, 100),
    '--text-color': CSSColor($theme.colors[$color].text, TShade.DEFAULT, 100),
  } as CSSProperties,
}))`
  position: relative;
  display: flex;
  align-items: flex-start;
  font-family: ${CSSVar('fontTextSansSerif')};

  &.${TMessageVariant.PRIMARY} {
    background-color: var(--message-color);
    color: var(--text-color);
  }

  &.${TMessageVariant.SECONDARY} {
    background-color: var(--message-color-semitransparent);
    border: ${CSSVar('messageBorderWidthSecondary')} solid var(--message-secondary-border-color);
    color: var(--message-color);

    ${MessageIconContainer} {
      background: var(--text-color);
      color: var(--message-color);
    }
  }

  &.${TMessageVariant.TERTIARY} {
    background-color: ${CSSColor(ThemeColors.TRANSPARENT, TShade.DEFAULT, 100)};
    border: none;
    color: var(--text-color-ternary);

    ${MessageIconContainer} {
      background: var(--text-color);
      color: var(--message-color);
    }
  }

  &.${TMessageSize.XS} {
    border-radius: ${CSSVar('messageBorderRadiusNano')};
    padding: ${CSSVar('messageSpacingNanoY')} ${CSSVar('messageSpacingNanoX')};
    gap: ${CSSVar('messageSpacingNanoY')};
    font-size: ${CSSVar('sizeTextSmall')};
    .${MessageIconContainer} {
      line-height: ${CSSVar('sizeTextNano')};
    }
  }

  &.${TMessageSize.S} {
    border-radius: ${CSSVar('messageBorderRadiusSmall')};
    padding: ${CSSVar('messageSpacingSmallY')} ${CSSVar('messageSpacingSmallX')};
    gap: ${CSSVar('messageSpacingSmallY')};
    font-size: ${CSSVar('sizeTextRegular')};
    line-height: 1.429;
    .${MessageIconContainer} {
      line-height: 1;
    }
  }

  &.${TMessageSize.M} {
    border-radius: ${CSSVar('messageBorderRadiusRegular')};
    padding: ${CSSVar('messageSpacingRegularY')} ${CSSVar('messageSpacingRegularX')};
    gap: ${CSSVar('messageSpacingRegularY')};
    font-size: ${CSSVar('sizeTextRegular')};
  }

  &.${TMessageSize.L} {
    border-radius: ${CSSVar('messageBorderRadiusLarge')};
    padding: ${CSSVar('messageSpacingRegularY')} ${CSSVar('messageSpacingRegularX')};
    gap: ${CSSVar('messageSpacingRegularY')};
    font-size: ${CSSVar('sizeTextLarge')};
  }
`;

export default function Message({
  type = TMessageVariant.PRIMARY,
  icon,
  size = TMessageSize.M,
  color = ThemeColors.ACCENT1,
  className,
  children,
  ...rest
}: TMessageProps) {
  const theme = useAppSelector(selectCurrentThemeData);
  return (
    <Root
      $theme={theme}
      $color={color}
      className={classNames(className, { [type]: true, [size]: true })}
      {...rest}
    >
      {icon && (
        <MessageIconContainer>
          <Icon size={MessageSizeToIconSize.get(size)} icon={icon} />
        </MessageIconContainer>
      )}
      <MessageContent>{children}</MessageContent>
    </Root>
  );
}
