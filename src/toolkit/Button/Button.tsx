import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import {
  TButtonProps,
  TButtonSize,
  TButtonStyledProps,
  TButtonVariant,
} from '@ui-toolkit/Button/types';
import { TIconSize } from '@ui-toolkit/Icon/icons';
import classNames from 'classnames';
import { motion } from 'motion/react';
import { CSSProperties } from 'react';
import styled, { css } from 'styled-components';
import Icon, { TIconType } from '../Icon/Icon';
import { popOnFocus } from '../motion/transitions';

const ButtonSizeToStyleMap: { [key in TButtonSize]: CSSProperties } = {
  [TButtonSize.LARGE]: {
    height: CSSVar('buttonHeightLarge'),
    padding: `${CSSVar('inputSpacingYLarge')} ${CSSVar('inputSpacingXLarge')}`,
    gap: CSSVar('inputSpacingXInnerLarge'),
    fontSize: CSSVar('inputTextSizeLarge'),
    fontWeight: CSSVar('inputTextWeightLarge'),
  },
  [TButtonSize.REGULAR]: {
    height: CSSVar('buttonHeightRegular'),
    padding: `${CSSVar('inputSpacingYRegular')} ${CSSVar('inputSpacingXRegular')}`,
    gap: CSSVar('inputSpacingXInnerRegular'),
    fontSize: CSSVar('inputTextSizeRegular'),
    fontWeight: CSSVar('inputTextWeightRegular'),
  },
  [TButtonSize.SMALL]: {
    height: CSSVar('buttonHeightSmall'),
    padding: `${CSSVar('inputSpacingYSmall')} ${CSSVar('inputSpacingXSmall')}`,
    gap: CSSVar('inputSpacingXInnerSmall'),
    fontSize: CSSVar('inputTextSizeSmall'),
    fontWeight: CSSVar('inputTextWeightSmall'),
  },
  [TButtonSize.NANO]: {
    height: CSSVar('buttonHeightNano'),
    padding: `${CSSVar('inputSpacingYNano')} ${CSSVar('inputSpacingXNano')}`,
    gap: CSSVar('inputSpacingXInnerNano'),
    fontSize: CSSVar('inputTextSizeNano'),
    fontWeight: CSSVar('inputTextWeightNano'),
  },
};

const ButtonPaddingToSizeMap = {
  [TButtonSize.LARGE]: {
    x: CSSVar('inputSpacingXLarge'),
    y: CSSVar('inputSpacingYLarge'),
    iconic: CSSVar('inputSpacingXLargeIconic'),
  },
  [TButtonSize.REGULAR]: {
    x: CSSVar('inputSpacingXRegular'),
    y: CSSVar('inputSpacingYRegular'),
    iconic: CSSVar('inputSpacingXRegularIconic'),
  },
  [TButtonSize.SMALL]: {
    x: CSSVar('inputSpacingXSmall'),
    y: CSSVar('inputSpacingYSmall'),
    iconic: CSSVar('inputSpacingXSmallIconic'),
  },
  [TButtonSize.NANO]: {
    x: CSSVar('inputSpacingXNano'),
    y: CSSVar('inputSpacingYNano'),
    iconic: CSSVar('inputSpacingXNanoIconic'),
  },
};

const buttonStyle = css`
  display: inline-flex;
  vertical-align: middle;
  position: relative;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  border: none;
  will-change: opacity, transform;
  background: transparent;
  overflow: visible;

  &:before {
    content: '';
    box-sizing: border-box;
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    transition:
      background-color 0.1s ease,
      box-shadow 0.1s ease;
  }

  & > * {
    position: relative;
  }
`;

const ButtonContent = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.forceIconic {
    position: absolute;
  }
`;

const getButtonSizeStyles: (
  $size: TButtonSize,
  $iconic: boolean,
  $withContent: boolean
) => CSSProperties = ($size, $iconic, $withContent) => {
  return {
    ...ButtonSizeToStyleMap[$size],
    ...($iconic && !$withContent
      ? {
          width: ButtonSizeToStyleMap[$size].height,
          padding: 0,
        }
      : {
          padding: `${ButtonPaddingToSizeMap[$size].y} ${$withContent ? ButtonPaddingToSizeMap[$size].x : ButtonPaddingToSizeMap[$size].iconic} 0 ${$iconic ? ButtonPaddingToSizeMap[$size].iconic : ButtonPaddingToSizeMap[$size].x}`,
        }),
  };
};

const StyledButtonDefault = styled(motion.button).attrs<TButtonStyledProps>(
  ({ $size, $iconic, $withContent }) => ({
    style: {
      ...getButtonSizeStyles($size, $iconic, $withContent),
    },
  })
)`
  ${buttonStyle};
  opacity: ${CSSVar('inputOpacity')};

  &:before {
    border-radius: ${CSSVar('inputBorderRadius')};
  }

  &[disabled] {
    opacity: ${CSSVar('inputOpacityDisabled')};
  }

  ${({ $theme, $color }) => css`
    color: ${CSSColor(
      $theme.colors[$color].text,
      $theme.variables.buttonColorShade.value,
      $theme.variables.buttonColorOpacity.value
    )};

    &:before {
      box-shadow: ${$theme.variables.buttonShadow.value};
      background-color: ${CSSColor(
        $color,
        $theme.variables.buttonBgShade.value,
        $theme.variables.buttonBgOpacity.value
      )};
    }

    &:hover {
      color: ${CSSColor(
        $theme.colors[$color].text,
        $theme.variables.buttonColorShadeHover.value,
        $theme.variables.buttonColorOpacityHover.value
      )};

      &:before {
        box-shadow: ${$theme.variables.buttonShadowHover.value};
        background-color: ${CSSColor(
          $color,
          $theme.variables.buttonBgShadeHover.value,
          $theme.variables.buttonBgOpacityHover.value
        )};
      }
    }

    &:focus,
    &:focus-within {
      color: ${CSSColor(
        $theme.colors[$color].text,
        $theme.variables.buttonColorShadeFocus.value,
        $theme.variables.buttonColorOpacityFocus.value
      )};

      &:before {
        box-shadow: ${$theme.variables.buttonShadowFocus.value};
        background-color: ${CSSColor(
          $color,
          $theme.variables.buttonBgShadeFocus.value,
          $theme.variables.buttonBgOpacityFocus.value
        )};
      }
    }

    &[disabled] {
      opacity: ${CSSVar('inputOpacityDisabled')};
      color: ${CSSColor(
        $theme.colors[$color].text,
        $theme.variables.buttonColorShadeDisabled.value,
        $theme.variables.buttonColorOpacityDisabled.value
      )};

      &:before {
        box-shadow: ${$theme.variables.buttonShadowDisabled.value};
        background-color: ${CSSColor(
          $color,
          $theme.variables.buttonBgShadeDisabled.value,
          $theme.variables.buttonBgOpacityDisabled.value
        )};
      }
    }
  `}
`;

const StyledButtonSecondary = styled(motion.button).attrs<TButtonStyledProps>(
  ({ $size, $iconic, $withContent }) => ({
    style: {
      ...getButtonSizeStyles($size, $iconic, $withContent),
    },
  })
)`
  ${buttonStyle};
  background: ${CSSColor(ThemeColors.TRANSPARENT, TShade.DEFAULT, 100)};
  opacity: ${CSSVar('inputOpacity')};

  &:before {
    border-radius: ${CSSVar('inputBorderRadius')};
  }

  &[disabled] {
    opacity: ${CSSVar('inputOpacityDisabled')};
  }

  ${({ $theme, $color }) => css`
    color: ${CSSColor(
      $color,
      $theme.variables.buttonColorShade.value,
      $theme.variables.buttonColorOpacity.value
    )};

    &:before {
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.buttonBgShade.value,
          $theme.variables.inputBorderColorOpacity.value
        )};
      box-shadow: ${CSSVar('buttonShadow')};
    }

    &:hover {
      color: ${CSSColor(
        $color,
        $theme.variables.buttonColorShadeHover.value,
        $theme.variables.buttonColorOpacityHover.value
      )};

      &:before {
        border: ${CSSVar('inputBorderWidth')} solid
          ${CSSColor(
            $color,
            $theme.variables.buttonBgShadeHover.value,
            $theme.variables.inputBorderColorOpacityHover.value
          )};
        box-shadow: ${CSSVar('buttonShadow')};
      }
    }

    &:focus,
    &:focus-within {
      color: ${CSSColor(
        $color,
        $theme.variables.buttonColorShadeFocus.value,
        $theme.variables.buttonColorOpacityFocus.value
      )};

      &:before {
        border: ${CSSVar('inputBorderWidth')} solid
          ${CSSColor(
            $color,
            $theme.variables.buttonBgShadeFocus.value,
            $theme.variables.inputBorderColorOpacityFocus.value
          )};
        box-shadow: ${CSSVar('buttonShadow')};
      }
    }

    &[disabled] {
      color: ${CSSColor(
        $color,
        $theme.variables.buttonColorShadeDisabled.value,
        $theme.variables.buttonColorOpacityDisabled.value
      )};

      &:before {
        border: ${CSSVar('inputBorderWidth')} solid
          ${CSSColor(
            $color,
            $theme.variables.buttonBgShadeDisabled.value,
            $theme.variables.inputBorderColorOpacityDisabled.value
          )};
        box-shadow: ${CSSVar('buttonShadow')};
      }
    }
  `}
`;

const StyledButtonSpecial = styled(motion.button).attrs<TButtonStyledProps>(
  ({ $size, $iconic, $withContent }) => ({
    style: {
      ...getButtonSizeStyles($size, $iconic, $withContent),
    },
  })
)`
  ${buttonStyle};
  opacity: ${CSSVar('inputOpacity')};

  &:before {
    border-radius: ${CSSVar('inputBorderRadius')};
  }

  &[disabled] {
    opacity: ${CSSVar('inputOpacityDisabled')};
  }

  ${({ $theme }) => css`
    color: ${CSSColor(
      $theme.variables.buttonSpecialColor.value,
      $theme.variables.buttonColorShade.value,
      $theme.variables.buttonColorOpacity.value
    )};
    text-shadow: 0 ${CSSVar('size1')} 0
      ${CSSColor($theme.variables.buttonSpecialBg1.value, $theme.variables.buttonBgShade.value, 10)};
    &:before {
      box-shadow: ${CSSVar('buttonShadow')};
      background: linear-gradient(
        120deg,
        ${CSSColor(
            $theme.variables.buttonSpecialBg1.value,
            $theme.variables.buttonBgShade.value,
            $theme.variables.buttonBgOpacity.value
          )}
          0%,
        ${CSSColor(
            $theme.variables.buttonSpecialBg2.value,
            $theme.variables.buttonBgShade.value,
            $theme.variables.buttonBgOpacity.value
          )}
          100%
      );
      border-bottom: 1px solid
        ${CSSColor(
          $theme.variables.buttonSpecialBg1.value,
          $theme.variables.buttonBgShade.value,
          5
        )};
    }

    &:hover {
      color: ${CSSColor(
        $theme.variables.buttonSpecialColor.value,
        $theme.variables.buttonColorShadeHover.value,
        $theme.variables.buttonColorOpacityHover.value
      )};

      &:before {
        box-shadow: ${CSSVar('buttonShadowHover')};
        background: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeHover.value,
              $theme.variables.buttonBgOpacityHover.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeHover.value,
              $theme.variables.buttonBgOpacityHover.value
            )}
            100%
        );
        border-bottom: 1px solid
          ${CSSColor(
            $theme.variables.buttonSpecialBg1.value,
            $theme.variables.buttonBgShade.value,
            5
          )};
      }
    }

    &:focus,
    &:focus-within {
      color: ${CSSColor(
        $theme.variables.buttonSpecialColor.value,
        $theme.variables.buttonColorShadeFocus.value,
        $theme.variables.buttonColorOpacityFocus.value
      )};

      &:before {
        box-shadow: ${CSSVar('buttonShadowFocus')};
        background: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeFocus.value,
              $theme.variables.buttonBgOpacityFocus.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeFocus.value,
              $theme.variables.buttonBgOpacityFocus.value
            )}
            100%
        );
      }
    }

    &[disabled] {
      color: ${CSSColor(
        $theme.variables.buttonSpecialColor.value,
        $theme.variables.buttonColorShadeDisabled.value,
        $theme.variables.buttonColorOpacityDisabled.value
      )};

      &:before {
        box-shadow: ${CSSVar('buttonShadowDisabled')};
        background: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeDisabled.value,
              $theme.variables.buttonBgOpacityDisabled.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeDisabled.value,
              $theme.variables.buttonBgOpacityDisabled.value
            )}
            100%
        );
        border-bottom: 1px solid
          ${CSSColor(
            $theme.variables.buttonSpecialBg1.value,
            $theme.variables.buttonBgShade.value,
            5
          )};
      }
    }
  `}
`;

const StyledButtonSecondarySpecial = styled(motion.button).attrs<TButtonStyledProps>(
  ({ $size, $iconic, $withContent }) => ({
    style: {
      ...getButtonSizeStyles($size, $iconic, $withContent),
    },
  })
)`
  ${buttonStyle};
  opacity: ${CSSVar('inputOpacity')};
  color: transparent;
  ${ButtonContent} {
    background-clip: text;
    color: transparent;
  }

  &:before {
    border-radius: ${CSSVar('inputBorderRadius')};
    padding: ${CSSVar('inputBorderWidth')};
    background-clip: padding-box;
    mask:
      conic-gradient(#000 0 0) content-box,
      conic-gradient(#000 0 0);
    mask-composite: exclude;
    padding: 1px;
    border: none;
  }

  &[disabled] {
    opacity: ${CSSVar('inputOpacityDisabled')};
  }

  ${({ $theme }) => css`
    ${ButtonContent} {
      color: transparent;
      background-image: linear-gradient(
        120deg,
        ${CSSColor(
            $theme.variables.buttonSpecialBg1.value,
            $theme.variables.buttonBgShade.value,
            $theme.variables.buttonBgOpacity.value
          )}
          0%,
        ${CSSColor(
            $theme.variables.buttonSpecialBg2.value,
            $theme.variables.buttonBgShade.value,
            $theme.variables.buttonBgOpacity.value
          )}
          100%
      );
    }
    &:before {
      box-shadow: ${CSSVar('buttonShadow')};

      background-image: linear-gradient(
        120deg,
        ${CSSColor(
            $theme.variables.buttonSpecialBg1.value,
            $theme.variables.buttonBgShade.value,
            $theme.variables.buttonBgOpacity.value
          )}
          0%,
        ${CSSColor(
            $theme.variables.buttonSpecialBg2.value,
            $theme.variables.buttonBgShade.value,
            $theme.variables.buttonBgOpacity.value
          )}
          100%
      );
    }

    &:hover {
      ${ButtonContent} {
        background-image: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeHover.value,
              $theme.variables.buttonBgOpacityHover.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeHover.value,
              $theme.variables.buttonBgOpacityHover.value
            )}
            100%
        );
      }

      &:before {
        box-shadow: ${CSSVar('buttonShadowHover')};
        background-image: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeHover.value,
              $theme.variables.buttonBgOpacityHover.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeHover.value,
              $theme.variables.buttonBgOpacityHover.value
            )}
            100%
        );
      }
    }

    &:focus,
    &:focus-within {
      ${ButtonContent} {
        background-image: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeFocus.value,
              $theme.variables.buttonBgOpacityFocus.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeFocus.value,
              $theme.variables.buttonBgOpacityFocus.value
            )}
            100%
        );
      }

      &:before {
        box-shadow: ${CSSVar('buttonShadowFocus')};
        background-image: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeFocus.value,
              $theme.variables.buttonBgOpacityFocus.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeFocus.value,
              $theme.variables.buttonBgOpacityFocus.value
            )}
            100%
        );
      }
    }

    &[disabled] {
      color: ${CSSColor(
        $theme.variables.buttonSpecialColor.value,
        $theme.variables.buttonColorShadeDisabled.value,
        $theme.variables.buttonColorOpacityDisabled.value
      )};

      &:before {
        box-shadow: ${CSSVar('buttonShadowDisabled')};
        background-image: linear-gradient(
          120deg,
          ${CSSColor(
              $theme.variables.buttonSpecialBg1.value,
              $theme.variables.buttonBgShadeDisabled.value,
              $theme.variables.buttonBgOpacityDisabled.value
            )}
            0%,
          ${CSSColor(
              $theme.variables.buttonSpecialBg2.value,
              $theme.variables.buttonBgShadeDisabled.value,
              $theme.variables.buttonBgOpacityDisabled.value
            )}
            100%
        );
        border-bottom: 1px solid
          ${CSSColor(
            $theme.variables.buttonSpecialBg1.value,
            $theme.variables.buttonBgShade.value,
            5
          )};
      }
    }
  `}
`;

const StyledInputTransparent = styled(motion.button).attrs<TButtonStyledProps>(
  ({ $size, $iconic, $withContent }) => ({
    style: {
      ...getButtonSizeStyles($size, $iconic, $withContent),
    },
  })
)`
  ${buttonStyle};
  background: ${CSSColor(ThemeColors.TRANSPARENT, TShade.DEFAULT, 100)};
  opacity: ${CSSVar('inputOpacity')};

  &:before {
    border-radius: ${CSSVar('inputBorderRadius')};
    background: ${CSSColor(ThemeColors.TRANSPARENT, TShade.DEFAULT, 100)};
    opacity: ${CSSVar('opacity-20')};
  }

  &[disabled] {
    opacity: ${CSSVar('inputOpacityDisabled')};
  }

  ${({ $theme, $color }) => css`
    color: ${CSSColor(
      $color,
      $theme.variables.buttonBgShade.value,
      $theme.variables.buttonBgOpacity.value
    )};

    &:hover {
      color: ${CSSColor(
        $color,
        $theme.variables.buttonBgShadeHover.value,
        $theme.variables.buttonBgOpacityHover.value
      )};
      &:before {
        background: ${CSSColor($color, $theme.variables.buttonBgShadeHover.value, 10)};
      }
    }

    &:focus,
    &:focus-within {
      color: ${CSSColor(
        $color,
        $theme.variables.buttonBgShadeFocus.value,
        $theme.variables.buttonBgOpacityFocus.value
      )};
      &:before {
        background: ${CSSColor($color, $theme.variables.buttonBgShadeFocus.value, 15)};
        border: 1px solid ${CSSColor($color, $theme.variables.buttonBgShadeFocus.value, 20)};
      }
    }

    &[diszabled] {
      color: ${CSSColor(
        $color,
        $theme.variables.buttonBgShadeDisabled.value,
        $theme.variables.buttonBgOpacityDisabled.value
      )};
    }
  `}
`;

const VariantToComponentMap: Record<TButtonVariant, typeof StyledButtonDefault> = {
  [TButtonVariant.PRIMARY]: StyledButtonDefault,
  [TButtonVariant.SECONDARY]: StyledButtonSecondary,
  [TButtonVariant.TRANSPARENT]: StyledInputTransparent,
  [TButtonVariant.SPECIAL]: StyledButtonSpecial,
  [TButtonVariant.SECONDARY_SPECIAL]: StyledButtonSecondarySpecial,
  [TButtonVariant.TRANSPARENT_SPECIAL]: StyledInputTransparent,
};

const ButtonSizeToIconSize = {
  [TButtonSize.LARGE]: TIconSize.XL,
  [TButtonSize.REGULAR]: TIconSize.L,
  [TButtonSize.SMALL]: TIconSize.M,
  [TButtonSize.NANO]: TIconSize.S,
};

export default function Button({
  ref,
  color,
  icon,
  children,
  type = 'button',
  className,
  size = TButtonSize.REGULAR,
  variant = TButtonVariant.PRIMARY,
  forceIconic,
  disabled = false,
  ...props
}: TButtonProps) {
  const iconSize = ButtonSizeToIconSize[size];
  const theme = useAppSelector(selectCurrentThemeData);
  const effectiveColor =
    variant === TButtonVariant.TRANSPARENT_SPECIAL || variant === TButtonVariant.SECONDARY_SPECIAL
      ? ThemeColors.ACCENT2
      : (color ?? theme.variables.buttonBgDefault.value);
  const Input = VariantToComponentMap[variant];
  const isIconic = (Boolean(icon) && !children) || forceIconic;
  return (
    <Input
      ref={ref}
      $theme={theme}
      $color={effectiveColor}
      $size={size}
      $iconic={Boolean(icon)}
      $variant={variant}
      $withContent={!isIconic}
      type={type as HTMLButtonElement['type']}
      className={classNames(className, { iconic: isIconic })}
      disabled={disabled}
      {...props}
      {...popOnFocus}
    >
      {icon && (
        <Icon
          type={
            variant === TButtonVariant.SECONDARY_SPECIAL ||
            variant === TButtonVariant.TRANSPARENT_SPECIAL
              ? TIconType.SPECIAL
              : TIconType.DEFAULT
          }
          icon={icon}
          size={iconSize}
        />
      )}
      {children && (
        <ButtonContent className={classNames({ forceIconic })}>{children}</ButtonContent>
      )}
    </Input>
  );
}
