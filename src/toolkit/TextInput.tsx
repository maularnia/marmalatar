import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import { TColor } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import Span from '@ui-toolkit/Span';
import classNames from 'classnames';
import {
  HTMLAttributes,
  HTMLProps,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import styled, { css } from 'styled-components';
import Icon from './Icon/Icon';
import { IconSize, TIconSize, TIcon } from './Icon/icons';
import Message, { TMessageSize, TMessageVariant } from './Message';

type TextInputProps = Omit<HTMLProps<HTMLInputElement>, 'children' | 'placeholder'> &
  PropsWithChildren<{
    icon?: TIcon;
    label?: string;
    errors?: ReactNode[];
    valid?: boolean;
    wrapperProps?: Omit<HTMLAttributes<HTMLLabelElement>, 'children' | 'htmlFor'>;
  }>;

const InputLabelContainer = styled(Span)`
  position: absolute;
  top: 0;
  line-height: ${CSSVar('inputHeightRegular')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  text-align: left;
  font-family: ${CSSVar('fontTextSansSerif')};
  padding: var(--input-padding);
  transition:
    font-size 0.12s ease,
    line-height 0.12s ease,
    padding 0.12s ease,
    transform 0.3s ease;
  cursor: text;
  opacity: ${CSSVar('opacity-50')};
`;

const Root = styled.label`
  display: inline-flex;
  position: relative;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYRegular')};
  min-width: ${CSSVar('inputHeightLarge')};
  opacity: ${CSSVar('inputOpacity')};
  &.disabled {
    opacity: ${CSSVar('opacity-20')};
    ${InputLabelContainer} {
      cursor: default;
    }
  }
  --input-padding: 0 ${CSSVar('inputSpacingXRegular')};
  &.iconic {
    --input-padding: 0 ${CSSVar('inputSpacingXRegular')} 0
      calc(
        ${CSSVar('inputSpacingXRegular')} + ${CSSVar('inputSpacingXInnerRegular')} + ${IconSize.M}px
      );
  }
`;

const Input = styled.input<{ $iconic?: boolean }>`
  all: unset;
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  border: none;
  appearance: none;
  flood-color: transparent;
  background: transparent;
  font-family: ${CSSVar('fontTextSansSerif')};
  height: ${CSSVar('inputHeightRegular')};
  padding: var(--input-padding);
  outline: none;
  &:focus,
  &:focus-visible {
    outline: none;
  }
`;
const FieldIcon = styled.span`
  position: absolute;
  left: ${CSSVar('inputSpacingXRegular')};
  font-size: 0;
  line-height: 0;
`;

const Field = styled.span<{ $color: TColor; $theme: TTheme }>`
  display: inline-flex;
  position: relative;
  align-items: center;
  width: 100%;
  margin: ${CSSVar('size2')} 0 0;
  height: ${CSSVar('inputHeightRegular')};
  border-radius: ${CSSVar('inputBorderRadius')};
  opacity: ${CSSVar('inputOpacity')};
  font-size: ${CSSVar('inputTextSizeRegular')};
  font-weight: ${CSSVar('inputTextWeightRegular')};
  cursor: text;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease,
    margin 0.3s ease;

  &.hasValue.hasLabel {
    margin-top: ${CSSVar('size24')};
  }

  ${({ $theme, $color }) => css`
    background: ${CSSColor(
      $color,
      $theme.variables.inputBgShade.value,
      $theme.variables.inputBgOpacity.value
    )};
    border: ${CSSVar('inputBorderWidth')} solid
      ${CSSColor(
        $color,
        $theme.variables.inputBorderColorShade.value,
        $theme.variables.inputBorderColorOpacity.value
      )};
    box-shadow: ${CSSVar('inputShadow')};

    ${Input}, ${FieldIcon} {
      color: ${CSSColor(
        $color,
        $theme.variables.inputColorShade.value,
        $theme.variables.inputColorOpacity.value
      )};
    }

    ${InputLabelContainer} {
      color: ${CSSColor(
        $color,
        $theme.variables.inputColorShade.value,
        $theme.variables.inputColorOpacity.value
      )};
    }

    &:hover {
      background: ${CSSColor(
        $color,
        $theme.variables.inputBgShadeHover.value,
        $theme.variables.inputBgOpacityHover.value
      )};
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.inputBorderColorShadeHover.value,
          $theme.variables.inputBorderColorOpacityHover.value
        )};
      box-shadow: ${CSSVar('inputShadowHover')};

      ${Input} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeHover.value,
          $theme.variables.inputColorOpacityHover.value
        )};
      }
      ${InputLabelContainer} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeHover.value,
          $theme.variables.inputColorOpacityHover.value
        )};
      }
    }

    &:focus-within {
      background: ${CSSColor(
        $color,
        $theme.variables.inputBgShadeFocus.value,
        $theme.variables.inputBgOpacityFocus.value
      )};
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.inputBorderColorShadeFocus.value,
          $theme.variables.inputBorderColorOpacityFocus.value
        )};
      box-shadow: ${CSSVar('inputShadowFocus')};

      ${Input}, ${FieldIcon} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeFocus.value,
          $theme.variables.inputColorOpacityFocus.value
        )};
      }
      ${InputLabelContainer} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeFocus.value,
          $theme.variables.inputColorOpacityFocus.value
        )};
      }
    }

    .disabled {
      background: ${CSSColor(
        $color,
        $theme.variables.inputBgShadeDisabled.value,
        $theme.variables.inputBgOpacityDisabled.value
      )};
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.inputBorderColorShadeDisabled.value,
          $theme.variables.inputBorderColorOpacityDisabled.value
        )};
      box-shadow: ${CSSVar('inputShadowDisabled')};

      ${Input}, ${FieldIcon} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeDisabled.value,
          $theme.variables.inputColorOpacityDisabled.value
        )};
      }
      ${InputLabelContainer} {
        color: ${CSSColor(
          $color,
          $theme.variables.inputColorShadeDisabled.value,
          $theme.variables.inputColorOpacityDisabled.value
        )};
      }
    }
  `}

  &.hasValue.hasLabel {
    ${InputLabelContainer} {
      --focus-height: calc(${CSSVar('inputHeightSmall')} * 1.3);
      font-size: ${CSSVar('inputTextSizeRegular')};
      font-family: ${CSSVar('fontTextSansSerif')};
      line-height: 1.28;
      padding: ${CSSVar('inputSpacingXNano')} 0;
      transform: translate3d(0, -100%, 0);
      transition:
        font-size 0.12s ease,
        line-height 0.12s ease,
        padding 0.16s ease,
        transform 0.12s ease;
      border-radius: var(--focus-height);
      opacity: 1;
      color: ${({ $color, $theme }) =>
        CSSColor(
          $color,
          $theme.variables.inputColorShade.value,
          $theme.variables.inputColorOpacity.value
        )};
    }
  }
`;

const Errors = styled.span`
  position: absolute;
  top: 100%;
  width: 100%;
  display: inline-flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYRegular')};
  padding: 0 ${CSSVar('inputSpacingXRegular')};
`;

const ErrorMessage = styled(Message)`
  padding-top: 0 !important;
  padding-bottom: 0 !important;
`;

export default function TextInput({
  icon,
  ref,
  children,
  errors,
  valid = false,
  disabled,
  type = 'text',
  wrapperProps,
  value,
  defaultValue,
  className,
  ...props
}: TextInputProps) {
  const hasErrors = Boolean(errors?.length);
  const theme = useAppSelector(selectCurrentThemeData);
  const color: TColor = hasErrors
    ? ThemeColors.RED
    : valid
      ? ThemeColors.GREEN
      : theme.variables.inputBgDefault.value;
  const shouldShowErrors = hasErrors && !valid;
  const [hasValue, setHasValue] = useState(!!defaultValue || !!value);
  const inputRef = useRef<HTMLInputElement>(null);

  const [currentValue, setCurrentValue] = useState(() => value || defaultValue);

  useEffect(() => {
    setHasValue(Boolean(inputRef.current?.value.length));
  }, [value, defaultValue, currentValue]);

  return (
    <Root className={classNames({ disabled: disabled, iconic: Boolean(icon) })} {...wrapperProps}>
      <Field
        $color={color}
        $theme={theme}
        className={classNames(className, { hasLabel: !!children, hasValue, disabled: disabled })}
      >
        {children ? <InputLabelContainer>{children}</InputLabelContainer> : null}
        <Input
          ref={(node) => {
            inputRef.current = node;
            if (!ref) return;
            if (typeof ref === 'function') {
              ref(node);
            } else {
              ref.current = node;
            }
          }}
          {...(value !== undefined ? { value } : { defaultValue })}
          {...props}
          type={type}
          disabled={disabled}
          onChange={(e) => {
            setCurrentValue(e.currentTarget.value);
            props.onChange?.(e);
          }}
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
            <ErrorMessage
              key={`text-input-error-${index}`}
              type={TMessageVariant.TERTIARY}
              size={TMessageSize.XS}
              color={ThemeColors.RED}
            >
              {error}
            </ErrorMessage>
          ))}
        </Errors>
      ) : null}
    </Root>
  );
}
