import { InputHTMLAttributes, PropsWithChildren } from 'react';
import { TColor } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import styled, { css } from 'styled-components';
import P, { TPVariant } from './P';

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> &
  PropsWithChildren & {
    color?: TColor;
    enabledColor?: TColor;
  };

const Knob = styled.span<{ $theme: TTheme; $color: TColor }>`
  position: absolute;
  top: ${CSSVar('toggleKnobInset')};
  left: ${CSSVar('toggleKnobInset')};
  width: calc(${CSSVar('toggleTrackHeight')} - calc(${CSSVar('toggleKnobInset')} * 2));
  height: calc(${CSSVar('toggleTrackHeight')} - calc(${CSSVar('toggleKnobInset')} * 2));
  border-radius: 50%;
  transition:
    left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.2s ease;
  pointer-events: none;

  ${({ $theme, $color }) => css`
    background: ${CSSColor(
      $color,
      $theme.variables.toggleColorShade.value,
      $theme.variables.toggleColorOpacity.value
    )};
  `}
`;

const Track = styled.div<{ $theme: TTheme; $color: TColor }>`
  flex-shrink: 0;
  position: relative;
  width: ${CSSVar('toggleTrackWidth')};
  height: ${CSSVar('toggleTrackHeight')};
  border-radius: 100px;
  transition:
    background 0.2s ease,
    transform 0.15s ease;

  ${({ $theme, $color }) => css`
    background: ${CSSColor(
      $color,
      $theme.variables.toggleBgShade.value,
      $theme.variables.toggleBgOpacity.value
    )};
  `}
`;

const NativeInput = styled.input<{ $theme: TTheme; $color: TColor; $enabledColor: TColor }>`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;

  ${({ $theme, $color, $enabledColor }) => css`
    &:checked ~ ${Track} {
      background: ${CSSColor(
        $enabledColor,
        $theme.variables.toggleEnabledBgShade.value,
        $theme.variables.toggleEnabledBgOpacity.value
      )};
    }
    &:checked ~ ${Track} ${Knob} {
      background: ${CSSColor(
        $theme.colors[$enabledColor].text,
        $theme.variables.toggleEnabledColorShade.value,
        $theme.variables.toggleEnabledColorOpacity.value
      )};
    }

    &:focus ~ ${Track}, &:focus-visible ~ ${Track} {
      transform: scale(${CSSVar('toggleScaleEmphasis')});
      background: ${CSSColor(
        $color,
        $theme.variables.toggleBgShade.value,
        $theme.variables.toggleBgOpacityFocus.value
      )};
    }

    &:checked:focus ~ ${Track}, &:checked:focus-visible ~ ${Track} {
      background: ${CSSColor(
        $enabledColor,
        $theme.variables.toggleEnabledBgShade.value,
        $theme.variables.toggleEnabledBgOpacityFocus.value
      )};
    }

    &[disabled] ~ ${Track} {
      transform: scale(${CSSVar('toggleScaleEmphasis')});
      background: ${CSSColor(
        $color,
        $theme.variables.toggleBgShade.value,
        $theme.variables.toggleBgOpacityDisabled.value
      )};
    }

    &:checked[disabled] ~ ${Track} {
      background: ${CSSColor(
        $enabledColor,
        $theme.variables.toggleEnabledBgShade.value,
        $theme.variables.toggleEnabledBgOpacityDisabled.value
      )};
    }
  `}

  &:checked ~ ${Track} ${Knob} {
    left: calc(
      ${CSSVar('toggleTrackWidth')} - ${CSSVar('toggleTrackHeight')} + ${CSSVar('toggleKnobInset')}
    );
  }

  &[disabled] ~ ${Track} {
    opacity: ${CSSVar('inputOpacityDisabled')};
    cursor: not-allowed;
  }
`;

const Root = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${CSSVar('inputSpacingXSmall')};
  cursor: pointer;
  user-select: none;
`;

const Label = styled(P)`
  display: inline;
`;

export default function Toggle({
  children,
  color = ThemeColors.TEXT,
  enabledColor = ThemeColors.GREEN,
  ...props
}: ToggleProps) {
  const theme = useAppSelector(selectCurrentThemeData);
  return (
    <Root>
      <NativeInput
        type="checkbox"
        $theme={theme}
        $color={color}
        $enabledColor={enabledColor}
        {...props}
      />
      <Track $theme={theme} $color={color}>
        <Knob $theme={theme} $color={color} />
      </Track>
      {children && <Label variant={TPVariant.SECONDARY}>{children}</Label>}
    </Root>
  );
}
