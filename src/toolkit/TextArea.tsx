import styled, { css } from 'styled-components';
import { TIconSize, IconSize, TIcon } from '@ui-toolkit/Icon/icons';
import {
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import Icon from '@ui-toolkit/Icon/Icon';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import { TColor, TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import Span from '@ui-toolkit/Span';
import classNames from 'classnames';

const Root = styled.label<{
  $minWidth?: string;
  $minHeight?: string;
  $maxWidth?: string;
  $maxHeight?: string;
}>`
  display: inline-flex;
  max-width: 100%;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingXRegular')};
  min-width: ${({ $minWidth }) => $minWidth ?? 'var(--space-xxxxl)'};
  max-width: ${({ $maxWidth }) => $maxWidth ?? 'none'};
  min-height: ${({ $minHeight }) => $minHeight ?? 'var(--space-xxxxl)'};
  max-height: ${({ $maxHeight }) => $maxHeight ?? 'none'};
`;
const Input = styled.textarea<{ $iconic?: boolean }>`
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 100)};
  max-width: 100%;
  min-width: 100%;
  max-height: 100%;
  min-height: 100%;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('inputTextSizeRegular')};
  line-height: calc(${CSSVar('inputTextSizeRegular')} * 1.2);
  scrollbar-width: thin;
  --webkit-scrollbar-width: thin;
  scrollbar-color: ${CSSColor(ThemeColors.BLACK, TShade.DEFAULT, 100)};
  --webkit-scrollbar-color: v${CSSColor(ThemeColors.BLACK, TShade.DEFAULT, 100)};
  ${({ $iconic }) => {
    return $iconic
      ? css`
          padding: ${CSSVar('inputSpacingXRegular')} ${CSSVar('inputSpacingXRegular')}
            ${CSSVar('inputSpacingXRegular')}calc
            (${CSSVar('inputSpacingXRegular')} * 2 + ${IconSize.M}px);
        `
      : css`
          padding: ${CSSVar('inputSpacingXRegular')} ${CSSVar('inputSpacingXRegular')};
        `;
  }}
`;

const LabelContainer = styled(Span)`
  position: absolute;
  top: 0;
  line-height: ${CSSVar('inputSpacingXRegular')};
  padding: ${CSSVar('inputSpacingXRegular')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  text-align: left;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-weight: ${CSSVar('inputTextWeightRegular')};
  pointer-events: none;
  transition:
    font-size 0.12s ease,
    line-height 0.12s ease,
    padding 0.12s ease,
    transform 0.12s ease;
  opacity: ${CSSVar('opacity-50')};
`;

const Field = styled.span<{ $theme: TTheme; $color: TColor }>`
  position: relative;
  align-items: center;
  border-radius: ${CSSVar('inputBorderRadius')};
  transition:
    background-color 0.12s ease,
    box-shadow 0.12s ease,
    border-color 0.12s ease,
    margin 0.12s ease;
  width: 100%;
  height: 100%;
  box-shadow: ${CSSVar('inputShadow')};
  opacity: ${CSSVar('inputOpacity')};

  &.hasValue {
    margin-top: ${CSSVar('size24')};
  }
  &:hover {
    box-shadow: ${CSSVar('inputShadowHover')};
  }
  &:focus-within {
    box-shadow: ${CSSVar('inputShadowFocus')};
  }
  &.disabled {
    box-shadow: ${CSSVar('inputShadowDisabled')};
  }
  ${({ $color, $theme }) => css`
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
    .${Input} {
      color: ${CSSColor(
        $theme.colors[$color].text,
        $theme.variables.inputColorShade.value,
        $theme.variables.inputColorOpacity.value
      )};
    }
    ${LabelContainer} {
      color: ${CSSColor(
        $color,
        $theme.variables.inputColorShade.value,
        $theme.variables.inputColorOpacity.value
      )};
      background: ${CSSColor(
        $theme.colors[$color].text,
        $theme.variables.inputBgShade.value,
        $theme.variables.inputBgOpacity.value
      )};
    }
    &.hasValue ${LabelContainer} {
      --focus-height: calc(${CSSVar('inputHeightSmall')} * 1.3);
      font-size: ${CSSVar('inputTextSizeRegular')};
      line-height: 1.28;
      padding: ${CSSVar('inputSpacingXNano')} 0;
      transform: translate3d(0, -100%, 0);
      backdrop-filter: blur(${CSSVar('blurLight')});
      border-radius: var(--focus-height);
      opacity: 1;
      color: ${CSSColor(
        $color,
        $theme.variables.inputColorShade.value,
        $theme.variables.inputColorOpacity.value
      )};
      background: ${CSSColor(
        $theme.colors[$color].text,
        $theme.variables.inputColorShadeFocus.value,
        $theme.variables.inputBgOpacityFocus.value
      )};
    }
    &:hover {
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
      .${Input} {
        color: ${CSSColor(
          $theme.colors[$color].text,
          $theme.variables.inputColorShadeHover.value,
          $theme.variables.inputColorOpacityHover.value
        )};
      }
    }
    &:focus-within {
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
      .${Input} {
        color: ${CSSColor(
          $theme.colors[$color].text,
          $theme.variables.inputColorShadeFocus.value,
          $theme.variables.inputColorOpacityFocus.value
        )};
      }
    }
    &.disabled {
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
      .${Input} {
        color: ${CSSColor(
          $theme.colors[$color].text,
          $theme.variables.inputColorShadeDisabled.value,
          $theme.variables.inputColorOpacityDisabled.value
        )};
      }
    }
  `}
  .disabled {
    opacity: ${CSSVar('inputOpacityDisabled')};
  }
`;

const FieldIcon = styled.span`
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 100)};
  position: absolute;
  left: ${CSSVar('inputSpacingXRegular')};
`;

const Errors = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYRegular')};
`;

type TextAreaInputProps = Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'children'> &
  PropsWithChildren<{
    icon?: TIcon;
    errors?: ReactNode[];
    valid?: boolean;
    resize?: boolean;
    minHeight?: string;
    minWidth?: string;
    maxHeight?: string;
    maxWidth?: string;
  }>;

export default function TextArea({
  children,
  errors,
  style,
  resize = true,
  minWidth = CSSVar('inputHeightLarge'),
  minHeight = `calc(${CSSVar('inputHeightLarge')} * 2)`,
  maxHeight,
  maxWidth,
  valid,
  disabled,
  icon,
  value,
  defaultValue,
  ...props
}: TextAreaInputProps) {
  const hasErrors = Boolean(errors?.length);
  const theme = useAppSelector(selectCurrentThemeData);
  const color = hasErrors
    ? ThemeColors.RED
    : valid
      ? ThemeColors.GREEN
      : theme.variables.inputBgDefault.value;
  const shouldShowErrors = hasErrors && !valid;
  const [hasValue, setHasValue] = useState(Boolean(value ?? defaultValue));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    setHasValue(Boolean(el.value));
  }, [value]);

  return (
    <Root $maxWidth={maxWidth} $minWidth={minWidth} $minHeight={minHeight} $maxHeight={maxHeight}>
      <Field
        $theme={theme}
        $color={color}
        className={classNames({ hasValue: hasValue && Boolean(children) })}
      >
        {children && <LabelContainer>{children}</LabelContainer>}
        <Input
          ref={textareaRef}
          style={{ resize: resize ? 'both' : 'none', minHeight, ...(style ? style : {}) }}
          value={value}
          defaultValue={defaultValue}
          {...props}
          disabled={disabled}
          $iconic={Boolean(icon)}
        />
        {icon ? (
          <FieldIcon>
            <Icon icon={icon} size={TIconSize.M} />
          </FieldIcon>
        ) : null}
      </Field>
      {shouldShowErrors ? (
        <Errors>
          {errors?.map((error, index) => (
            <Message
              key={`text-input-error-${index}`}
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.S}
              color={ThemeColors.RED}
            >
              {error}
            </Message>
          ))}
        </Errors>
      ) : null}
    </Root>
  );
}
