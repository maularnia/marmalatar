import { InputHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import Icon from './Icon/Icon';
import { TIconSize, TIcon } from './Icon/icons';
import { TColor, TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> &
  PropsWithChildren<{
    errors?: ReactNode[];
    valid?: boolean;
  }>;

const Control = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${CSSVar('inputSpacingXSmall')};
`;

const Tick = styled.span`
  position: absolute;
  align-items: center;
  justify-content: center;
  left: 50%;
  top: 50%;
  font-size: 0;
  line-height: 0;
  transform: translate(-35%, -35%) scale(0.9);
  opacity: 0;
  transition:
    transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.1s linear;
`;

const Box = styled.div<{ $theme: TTheme; $color: TColor }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: ${CSSVar('inputHeightSmall')};
    height: ${CSSVar('inputHeightSmall')};;
    opacity: ${CSSVar('inputOpacity')};

    &:before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        border-radius: ${CSSVar('inputBorderRadius')};
    }

    ${({ $theme, $color }) => css`
      color: ${CSSColor(
        $color,
        $theme.variables.inputColorShade.value,
        $theme.variables.inputColorOpacity.value
      )};

      &:before {
        border: ${CSSVar('inputBorderWidth')} solid
          ${CSSColor(
            $color,
            $theme.variables.inputBorderColorShade.value,
            $theme.variables.inputBorderColorOpacity.value
          )};
        background: ${CSSColor(
          $color,
          $theme.variables.inputBgShade.value,
          $theme.variables.inputBgOpacity.value
        )};
        box-shadow: ${CSSVar('inputShadow')};
      }
    `}
}`;

const Root = styled.label<{ $color: TColor; $theme: TTheme }>`
  display: inline-flex;
  flex-direction: column;
  gap: ${CSSVar('size2')};
  cursor: pointer;
  user-select: none;

  ${({ $theme, $color }) => css`
    &:hover {
      ${Box} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeHover.value,
          $theme.variables.inputColorOpacityHover.value
        )};
        &:before {
          border: ${CSSVar('inputBorderWidthHover')} solid
            ${CSSColor(
              $color,
              $theme.variables.inputBorderColorShadeHover.value,
              $theme.variables.inputBorderColorOpacityHover.value
            )};
          background: ${CSSColor(
            $color,
            $theme.variables.inputBgShadeHover.value,
            $theme.variables.inputBgOpacityHover.value
          )};
          box-shadow: ${CSSVar('inputShadowHover')};
        }
      }
    }
    &:focus-within {
      ${Box} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeFocus.value,
          $theme.variables.inputColorOpacityFocus.value
        )};
        &:before {
          border: ${CSSVar('inputBorderWidthFocus')} solid
            ${CSSColor(
              $color,
              $theme.variables.inputBorderColorShadeFocus.value,
              $theme.variables.inputBorderColorOpacityFocus.value
            )};
          background: ${CSSColor(
            $color,
            $theme.variables.inputBgShadeFocus.value,
            $theme.variables.inputBgOpacityFocus.value
          )};
          box-shadow: ${CSSVar('inputShadowFocus')};
        }
      }
    }
  `}
`;

const NativeInput = styled.input<{ $theme: TTheme; $color: TColor }>`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;

    &:checked + ${Box} {
        ${Tick} {
            opacity: 1;
            transform: translate(-33%, -55%) scale(1);
        }
    }
    ${({ $theme, $color }) => css`
      &[disabled] + ${Box} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeDisabled.value,
          $theme.variables.inputColorOpacityDisabled.value
        )};
        opacity: ${CSSVar('inputOpacityDisabled')};
        &:before {
          border: ${CSSVar('inputBorderWidthDisabled')} solid
            ${CSSColor(
              $color,
              $theme.variables.inputBorderColorShadeDisabled.value,
              $theme.variables.inputBorderColorOpacityDisabled.value
            )};
          background: ${CSSColor(
            $color,
            $theme.variables.inputBgShadeDisabled.value,
            $theme.variables.inputBgOpacityDisabled.value
          )};
          box-shadow: ${CSSVar('inputShadowDisabled')};
        }
      }
    `}
    }
`;

const Label = styled.span`
  color: inherit;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('inputTextSizeRegular')};
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 100)};
`;

const Errors = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYSmall')};
`;

export default function Checkbox({
  children,
  errors,
  valid = false,
  disabled,
  ...props
}: CheckboxProps) {
  const hasErrors = Boolean(errors?.length);
  const theme = useAppSelector(selectCurrentThemeData);
  const color = valid
    ? ThemeColors.GREEN
    : hasErrors
      ? ThemeColors.RED
      : theme.variables.inputBgDefault.value;

  return (
    <Root $theme={theme} $color={color}>
      <Control>
        <NativeInput $color={color} $theme={theme} {...props} disabled={disabled} type="checkbox" />
        <Box $theme={theme} $color={color}>
          <Tick>
            <Icon icon={TIcon.TICK} size={TIconSize.L} />
          </Tick>
        </Box>
        {children ? <Label>{children}</Label> : null}
      </Control>
      {!valid && hasErrors ? (
        <Errors>
          {errors?.map((error, index) => (
            <Message
              key={index}
              color={ThemeColors.RED}
              size={TMessageSize.S}
              type={TMessageVariant.SECONDARY}
            >
              {error}
            </Message>
          ))}
        </Errors>
      ) : null}
    </Root>
  );
}
