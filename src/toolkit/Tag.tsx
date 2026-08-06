import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import { TColor, TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import { CSSProperties, HTMLProps, MouseEvent, Ref } from 'react';
import styled from 'styled-components';
import Icon from './Icon/Icon';
import { TIconSize, TIcon } from './Icon/icons';

export enum TTagSize {
  NANO = 'nano',
  SMALL = 'small',
  REGULAR = 'regular',
}

export enum TTagVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export type TagProps = {
  color?: TColor;
  icon?: TIcon;
  size?: TTagSize;
  variant?: TTagVariant;
  elementRef?: Ref<HTMLDivElement>;
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
} & Omit<HTMLProps<HTMLDivElement>, 'color' | 'size'>;

const getVariantCSS = (theme: TTheme, variant: TTagVariant, color: TColor): CSSProperties => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: 'var(--tag-color)',
        color: CSSColor(theme.colors[color].text, TShade.DEFAULT, 100),
      };
    case 'secondary':
      return {
        border: `${CSSVar('inputBorderWidth')} solid var(--tag-border-color, transparent)`,
        color: 'var(--tag-color)',
      };
  }
  return {};
};

const SIZE_STYLES: Record<
  TTagSize,
  { x: string; y: string; fontSize: string; lineHeight: number; fontWeight: string }
> = {
  [TTagSize.NANO]: {
    x: CSSVar('tagSpacingNanoX'),
    y: CSSVar('tagSpacingNanoY'),
    fontSize: CSSVar('tagTextSizeNano'),
    lineHeight: 1.28,
    fontWeight: CSSVar('tagTextWeightNano'),
  },
  [TTagSize.SMALL]: {
    x: CSSVar('tagSpacingSmallX'),
    y: CSSVar('tagSpacingSmallY'),
    fontSize: CSSVar('tagTextSizeSmall'),
    lineHeight: 1.167,
    fontWeight: CSSVar('tagTextWeightSmall'),
  },
  [TTagSize.REGULAR]: {
    x: CSSVar('tagSpacingRegularX'),
    y: CSSVar('tagSpacingRegularY'),
    fontSize: CSSVar('tagTextSizeRegular'),
    lineHeight: 1.28,
    fontWeight: CSSVar('tagTextWeightRegular'),
  },
};

const getSizes = (
  size: TTagSize,
  hasLeadingIcon: boolean,
  hasTrailingIcon: boolean
): CSSProperties => {
  const { x, y, ...rest } = SIZE_STYLES[size];
  const left = hasLeadingIcon ? `calc(${x} / 2)` : x;
  const right = hasTrailingIcon ? `calc(${x} / 2)` : x;
  return { ...rest, padding: `${y} ${right} ${y} ${left}`, gap: x };
};

const TagBrick = styled.div.attrs<{
  $theme: TTheme;
  $color: TColor;
  $iconic: boolean;
  $removable: boolean;
  $size: TTagSize;
  $variant: TTagVariant;
}>(({ $theme, $color, $size, $iconic, $removable, $variant }) => {
  return {
    style: {
      '--tag-color': CSSColor($color, TShade.DEFAULT, 95),
      '--tag-border-color': CSSColor($color, TShade.DEFAULT, 20),
      '--tag-color-dimmed': CSSColor($color, TShade.DIMM, 100),
      '--tag-color-hover': CSSColor($color, TShade.BRIGHT, 100),
      ...getVariantCSS($theme, $variant, $color),
      ...getSizes($size, $iconic, $removable),
    },
  };
})`
  display: inline-flex;
  vertical-align: center;
  font-family: ${CSSVar('fontTextSansSerif')};
  border-radius: ${CSSVar('tagBorderRadiusRegular')};
  backdrop-filter: ${CSSVar('tagBackdropFilter')};
  max-width: 100%;
  align-items: center;
  box-shadow: inste 0 -1px 0 var(--tag-color-dimmed);
`;
const TagIcon = styled.div`
  font-size: 0;
  line-height: 0;
  flex-shrink: 0;
  flex-grow: 0;
  position: relative;
`;
const TagContent = styled.div`
  flex-basis: 100%;
  max-width: 100%;
  flex-shrink: 1;
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  align-items: center;
  white-space: nowrap;
`;
const TagRemoveButton = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0;
  line-height: 0;
  flex-shrink: 0;
  flex-grow: 0;
  cursor: pointer;
  position: relative;
  opacity: ${CSSVar('opacity-70')};
  transition: opacity 0.1s ease;

  &:hover,
  &:focus-visible {
    opacity: 1;
  }
`;

export default function Tag({
  children,
  color = ThemeColors.ACCENT2,
  size = TTagSize.REGULAR,
  icon,
  variant = TTagVariant.PRIMARY,
  elementRef,
  onRemove,
  ...rootProps
}: TagProps) {
  const theme = useAppSelector(selectCurrentThemeData);
  return (
    <TagBrick
      ref={elementRef}
      {...rootProps}
      $theme={theme}
      $iconic={!!icon}
      $removable={!!onRemove}
      $size={size}
      $color={color}
      $variant={variant}
    >
      {!!icon && (
        <TagIcon>
          <Icon icon={icon} />
        </TagIcon>
      )}
      <TagContent>{children}</TagContent>
      {onRemove && (
        <TagRemoveButton
          type="button"
          aria-label="Remove"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(event);
          }}
        >
          <Icon icon={TIcon.CROSS} size={TIconSize.XS} />
        </TagRemoveButton>
      )}
    </TagBrick>
  );
}
