import { CSSProperties } from 'react';
import styled, { createGlobalStyle, css } from 'styled-components';
import { TOptionSelect } from '@ui-toolkit/Select/Select';
import Tag, { TTagSize } from '@ui-toolkit/Tag';
import { TIconSize, TIcon } from '@ui-toolkit/Icon/icons';
import { TColor, TOpacity } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import { ListItem } from '../ListItem';
import Span from '@ui-toolkit/Span';
import Icon from '@ui-toolkit/Icon/Icon';
import { noop } from '@utils/noop';
import type {
  DropdownIndicatorProps,
  MenuListProps,
  MultiValueProps,
  NoticeProps,
  OptionProps,
  SingleValueProps,
} from 'react-select';

// ─── Themed outer wrapper ─────────────────────────────────────────────────────

type ThemedSelectWrapperProps = {
  $theme: TTheme;
  $color: TColor;
};

export const FloatingLabel = styled(Span)<{ $color: TColor; $theme: TTheme }>`
  position: absolute;
  top: 0;
  left: 0;
  line-height: ${CSSVar('inputHeightRegular')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  pointer-events: none;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('inputTextSizeRegular')};
  font-weight: ${CSSVar('inputTextWeightRegular')};
  padding: 0 ${CSSVar('inputSpacingXRegular')};
  color: ${({ $color, $theme }) =>
    CSSColor(
      $color,
      $theme.variables.inputColorShade.value,
      $theme.variables.inputColorOpacity.value
    )};
  transition:
    font-size 0.12s ease,
    line-height 0.12s ease,
    padding 0.12s ease,
    transform 0.12s ease;
  opacity: ${CSSVar('opacity-50')};

  &.hasValue {
    --focus-height: calc(${CSSVar('inputHeightSmall')} * 1.3);
    font-size: ${CSSVar('inputTextSizeRegular')};
    line-height: 1.28;
    padding: ${CSSVar('inputSpacingXNano')} 0;
    transform: translate3d(0, -100%, 0);
    opacity: 1;
    color: ${({ $color, $theme }) =>
      CSSColor(
        $color,
        $theme.variables.inputColorShade.value,
        $theme.variables.inputColorOpacity.value
      )};
  }
`;

// ─── Single value glyph + label ───────────────────────────────────────────────

const SingleValueRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${CSSVar('inputSpacingXInnerRegular')};
`;

const SingleValueGlyphSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: calc(${CSSVar('inputTextSizeRegular')} * 1.429);
  width: calc(${CSSVar('inputTextSizeRegular')} * 1.429);
`;

export const ThemedSelectWrapper = styled.div<ThemedSelectWrapperProps>`
  position: relative;
  transition: margin 0.3s ease;
  &.hasPlaceholder.hasValue {
    margin-top: ${CSSVar('size24')};
  }

  .rselect__control {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    backdrop-filter: none !important;
    padding: ${CSSVar('inputSpacingYRegular')} ${CSSVar('inputSpacingXRegularIconic')} !important;
    min-height: ${CSSVar('buttonHeightRegular')} !important;
    border-radius: ${CSSVar('inputBorderRadius')} !important;
    font-size: ${CSSVar('inputTextSizeRegular')};
    font-weight: ${CSSVar('inputTextWeightRegular')};
    font-family: ${CSSVar('fontTextSansSerif')};
    transition:
      background-color 0.1s ease,
      box-shadow 0.1s ease;
    cursor: pointer;
  }

  .rselect__value-container {
    width: 100%;
    gap: ${CSSVar('inputSpacingXInnerRegular')};
    padding: 0 !important;
    flex-wrap: wrap;
  }

  .rselect__input-container {
    margin: 0 !important;
    padding: 0 !important;
    color: inherit !important;
  }

  .rselect__single-value {
    color: inherit !important;
    margin: 0 !important;
  }

  .rselect__indicators {
    align-self: center;
  }
  .rselect__dropdown-indicator,
  .rselect__clear-indicator {
    padding: 0;
  }

  ${({ $theme, $color }) => css`
    .rselect__control {
      background-color: ${CSSColor(
        $color,
        $theme.variables.selectBodyBgShade.value,
        $theme.variables.selectBodyBgOpacity.value
      )} !important;
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.selectBodyBgShade.value,
          ($theme.variables.selectBodyBgOpacity.value + 5) as TOpacity
        )} !important;
      box-shadow: ${$theme.variables.selectBodyShadow.value} !important;
      backdrop-filter: ${CSSVar('inputBevelBackdropFilter')} !important;
      ${SingleValueRow} {
        color: ${CSSColor(
          $color,
          $theme.variables.selectBodyColorShade.value,
          $theme.variables.selectBodyColorOpacity.value
        )} !important;
      }
    }

    .rselect__control:hover {
      background-color: ${CSSColor(
        $color,
        $theme.variables.selectBodyBgShadeHover.value,
        $theme.variables.selectBodyBgOpacityHover.value
      )} !important;
      box-shadow: ${$theme.variables.selectBodyShadowHover.value} !important;
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.selectBodyBgShadeHover.value,
          ($theme.variables.selectBodyBgOpacityHover.value + 5) as TOpacity
        )} !important;
      ${SingleValueRow} {
        color: ${CSSColor(
          $color,
          $theme.variables.selectBodyColorShadeHover.value,
          $theme.variables.selectBodyColorOpacityHover.value
        )} !important;
      }
    }

    .rselect__control--is-focused,
    .rselect__control--is-focused:hover {
      background-color: ${CSSColor(
        $color,
        $theme.variables.selectBodyBgShadeFocus.value,
        $theme.variables.selectBodyBgOpacityFocus.value
      )} !important;
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.selectBodyBgShadeFocus.value,
          ($theme.variables.selectBodyBgOpacityFocus.value + 5) as TOpacity
        )} !important;
      box-shadow: ${$theme.variables.selectBodyShadowFocus.value} !important;
      ${SingleValueRow} {
        color: ${CSSColor(
          $color,
          $theme.variables.selectBodyColorShadeFocus.value,
          $theme.variables.selectBodyColorOpacityFocus.value
        )} !important;
      }
    }
    .rselect__control--is-disabled,
    .rselect__control--is-disabled:hover {
      background-color: ${CSSColor(
        $color,
        $theme.variables.selectBodyBgShadeDisabled.value,
        $theme.variables.selectBodyBgOpacityDisabled.value
      )} !important;
      border: ${CSSVar('inputBorderWidth')} solid
        ${CSSColor(
          $color,
          $theme.variables.selectBodyBgShadeDisabled.value,
          $theme.variables.selectBodyBgOpacityDisabled.value
        )} !important;
      box-shadow: ${$theme.variables.selectBodyShadowDisabled.value} !important;
      ${SingleValueRow} {
        color: ${CSSColor(
          $color,
          $theme.variables.selectBodyColorShadeDisabled.value,
          $theme.variables.selectBodyColorOpacityDisabled.value
        )} !important;
      }
    }

    .rselect__dropdown-indicator svg {
      fill: ${CSSColor(
        $color,
        $theme.variables.selectBodyColorShade.value,
        $theme.variables.selectBodyColorOpacity.value
      )};
    }

    .rselect__control:hover .rselect__dropdown-indicator svg {
      fill: ${CSSColor(
        $color,
        $theme.variables.selectBodyColorShadeHover.value,
        $theme.variables.selectBodyColorOpacityHover.value
      )};
    }
  `}
`;

// ─── Dropdown container ───────────────────────────────────────────────────────

const StyledDropdown = styled.div`
  position: relative;
  border-radius: ${CSSVar('inputDropdownBorderRadius')};
  overflow: hidden;
  padding: ${CSSVar('inputDropdownSpacingInner')};

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${CSSVar('inputDropdownBorderRadius')};
    background: ${CSSVar('inputDropdownBg')};
    pointer-events: none;
  }
`;

// ─── Themed portal dropdown styles ───────────────────────────────────────────

export const ThemedDropdownPortalStyle = createGlobalStyle<{ $theme: TTheme }>`
  .app-global-overlays .rselect__menu {
    box-shadow: ${({ $theme }) => $theme.variables.inputDropdownShadow.value} !important;
    backdrop-filter: ${({ $theme }) => $theme.variables.inputDropdownBackdropFilter.value} !important;
    border-radius: ${CSSVar('inputDropdownBorderRadius')} !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
  }
`;

// ─── react-select custom components ──────────────────────────────────────────

export function buildReactSelectComponents<T extends TOptionSelect>() {
  return {
    Option: ({ data, isSelected, isFocused, isDisabled, innerRef, innerProps }: OptionProps<T>) => {
      const color = isSelected
        ? ThemeColors.ACCENT1
        : isFocused
          ? ThemeColors.TEXT
          : ThemeColors.TRANSPARENT;
      return (
        <div ref={innerRef} {...innerProps}>
          <ListItem
            color={color}
            isActive={isSelected}
            isFocused={isFocused}
            isDisabled={isDisabled}
            icon={data.icon}
            emoji={data.emoji}
          >
            {data.label ?? ''}
          </ListItem>
        </div>
      );
    },

    SingleValue: (props: SingleValueProps<T>) => {
      const { data, children, innerProps, getStyles, getClassNames } = props;
      return (
        <div
          {...innerProps}
          style={getStyles('singleValue', props) as CSSProperties}
          className={getClassNames('singleValue', props)}
        >
          <SingleValueRow>
            {(data.icon || data.emoji) && (
              <SingleValueGlyphSlot>
                {data.icon ? <Icon icon={data.icon} size={TIconSize.S} /> : data.emoji}
              </SingleValueGlyphSlot>
            )}
            <span>{children}</span>
          </SingleValueRow>
        </div>
      );
    },

    MultiValue: ({ data, removeProps }: MultiValueProps<T>) => (
      <Tag
        size={TTagSize.SMALL}
        color={data.color}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          removeProps.onClick?.(e as never);
        }}
        onRemove={noop}
      >
        {data.label}
      </Tag>
    ),

    NoOptionsMessage: ({ innerProps }: NoticeProps<T>) => (
      <div {...innerProps}>
        <ListItem color={ThemeColors.TEXT} isDisabled emoji="☹️">
          Nothing here
        </ListItem>
      </div>
    ),

    MenuList: ({ children, innerRef, innerProps }: MenuListProps<T>) => (
      <StyledDropdown>
        <div ref={innerRef} {...innerProps}>
          {children}
        </div>
      </StyledDropdown>
    ),

    DropdownIndicator: ({ selectProps }: DropdownIndicatorProps<T>) => (
      <Icon
        icon={selectProps.menuIsOpen ? TIcon.ARROW_TOGGLE_UP : TIcon.ARROW_TOGGLE_DOWN}
        size={TIconSize.S}
      />
    ),

    IndicatorSeparator: () => null,
  } as const;
}
