import { TColor, TOpacity, TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TTheme } from '@src/theme/types';
import { clamp } from '@src/utils/numbers';
import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Span from '@ui-toolkit/Span';
import classNames from 'classnames';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { ComponentPropsWithoutRef, ReactNode, Ref, useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

interface ListItemProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'children'> {
  icon?: TIcon;
  color?: TColor;
  compact?: boolean;
  isActive?: boolean;
  isFocused?: boolean;
  isDisabled?: boolean;
  isError?: boolean;
  progress?: number;
  panel?: ReactNode;
  emoji?: ReactNode;
  children?: string | null;
  onChange?: (value: string) => void;
  onCommit?: () => void;
  onDiscard?: () => void;
  ref?: Ref<HTMLDivElement>;
}

const ProgressLayer = styled.div<{ $theme: TTheme; $color: TColor }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  transform-origin: left;
  pointer-events: none;
  ${({ $theme, $color }) => {
    const opacity = $theme.variables.listItemBgOpacity.value + 5;
    return css`
      background-color: ${CSSColor(
        $color,
        TShade.DEFAULT,
        (opacity > 100 ? 100 : opacity) as TOpacity
      )};
    `;
  }}
`;

const Root = styled.div<{ $theme: TTheme; $color: TColor }>`
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid transparent;
  gap: ${CSSVar('listItemSpacingInnerX')};
  cursor: pointer;
  border-radius: ${CSSVar('listItemBorderRadius')};
  width: 100%;
  overflow: hidden;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('listItemTextSize')};
  font-weight: ${CSSVar('semibold')};
  line-height: 1.429;
  padding: ${CSSVar('listItemSpacingY')} ${CSSVar('listItemSpacingX')};
  ${({ $theme, $color }) => css`
    color: ${CSSColor(
      $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
      $theme.variables.listItemColorShade.value,
      $theme.variables.listItemColorOpacity.value
    )};
    border-color: transparent;
    background-color: ${CSSColor($color, $theme.variables.listItemBgShade.value, 0)};

    &:hover {
      color: ${CSSColor(
        $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
        $theme.variables.listItemColorShadeHover.value,
        $theme.variables.listItemColorOpacityHover.value
      )};
      background-color: ${CSSColor(
        $color,
        $theme.variables.listItemBgShadeHover.value,
        $theme.variables.listItemBgOpacityHover.value
      )};
    }
    &:focus,
    &:focus-within,
    &.isFocused {
      color: ${CSSColor(
        $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
        $theme.variables.listItemColorShadeFocus.value,
        $theme.variables.listItemColorOpacityFocus.value
      )};
      background-color: ${CSSColor(
        $color,
        $theme.variables.listItemBgShadeFocus.value,
        $theme.variables.listItemBgOpacityFocus.value
      )};
      border-color: ${CSSColor(
        $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
        $theme.variables.listItemBgShadeFocus.value,
        10
      )};
    }

    &.isActive {
      cursor: default;
      color: ${CSSColor(
        $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
        $theme.variables.listItemColorShadeActive.value,
        $theme.variables.listItemColorOpacityActive.value
      )};
      background-color: ${CSSColor(
        $color,
        $theme.variables.listItemBgShadeActive.value,
        $theme.variables.listItemBgOpacityActive.value
      )};
      border-color: ${CSSColor(
        $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
        $theme.variables.listItemBgShadeActive.value,
        30
      )};
      &:hover {
        color: ${CSSColor(
          $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
          $theme.variables.listItemColorShadeActiveHover.value,
          $theme.variables.listItemColorOpacityActiveHover.value
        )};
        background-color: ${CSSColor(
          $color,
          $theme.variables.listItemBgShadeActiveHover.value,
          $theme.variables.listItemBgOpacityActiveHover.value
        )};
      }
      &:focus,
      &:focus-within,
      &.isFocused {
        color: ${CSSColor(
          $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
          $theme.variables.listItemColorShadeFocus.value,
          $theme.variables.listItemColorOpacityFocus.value
        )};
        background-color: ${CSSColor(
          $color,
          $theme.variables.listItemBgShadeFocus.value,
          $theme.variables.listItemBgOpacityFocus.value
        )};
        border-color: ${CSSColor(
          $color === ThemeColors.TRANSPARENT ? $theme.colors[$color].text : $color,
          $theme.variables.listItemBgShadeFocus.value,
          30
        )};
      }
    }

    &.isDisabled,
    &.isDisabled:hover {
      cursor: default;
      color: ${CSSColor(
        $color,
        $theme.variables.listItemColorShadeDisabled.value,
        $theme.variables.listItemColorOpacityDisabled.value
      )};
      border-color: transparent;
      background: transparent;
    }
  `}
`;
const ListItemIconSlot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  flex-shrink: 0;
  flex-grow: 0;
  height: calc(${CSSVar('listItemTextSize')} * 1.429);
  width: calc(${CSSVar('listItemTextSize')} * 1.429);
`;

const ListItemText = styled(Span)`
  display: block;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  z-index: 1;
  letter-spacing: -0.035rem;
`;

const ListItemTextEditable = styled.div`
  display: block;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  z-index: 1;

  outline: none;
  cursor: text;
  caret-color: currentColor;
`;

const PanelWrapper = styled(motion.div)`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
`;

export const ListItem = ({
  icon,
  color = ThemeColors.TEXT,
  isActive,
  isFocused,
  compact,
  isDisabled = false,
  isError = false,
  progress,
  children,
  panel,
  emoji,
  onChange,
  onCommit,
  onDiscard,
  onMouseEnter,
  onMouseLeave,
  tabIndex,
  ref: forwardedRef,
  ...rest
}: ListItemProps) => {
  const theme = useAppSelector(selectCurrentThemeData);
  const [isHovered, setIsHovered] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const prevIsErrorRef = useRef(false);
  const [, animate] = useAnimate();
  const isEditable = Boolean(onChange);
  const resolvedTabIndex = isDisabled || isEditable ? -1 : (tabIndex ?? 0);
  const setRootRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  useEffect(() => {
    if (!isEditable || !editableRef.current) return;
    const el = editableRef.current;
    el.textContent = children ?? '';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditable]);

  useEffect(() => {
    if (isError && !prevIsErrorRef.current && rootRef.current) {
      void animate(rootRef.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.3 });
    }
    prevIsErrorRef.current = isError;
  }, [isError, animate]);

  return (
    <Root
      ref={setRootRef}
      tabIndex={resolvedTabIndex}
      $theme={theme}
      $color={isError ? ThemeColors.RED : color}
      className={classNames({ isActive, isFocused, isDisabled, isError })}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {progress != null && progress > 0 && (
        <ProgressLayer
          $theme={theme}
          $color={isError ? ThemeColors.RED : color}
          style={{ width: `${clamp(progress, 0, 100)}%` }}
        />
      )}
      {icon && (
        <ListItemIconSlot>
          <Icon icon={icon} />
        </ListItemIconSlot>
      )}
      {emoji && <ListItemIconSlot>{emoji}</ListItemIconSlot>}
      {!compact &&
        (isEditable ? (
          <ListItemTextEditable
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange?.(e.currentTarget.textContent ?? '')}
            onKeyDown={(e) => {
              // Stop every keydown here from bubbling to document-level shortcut listeners
              // (react-keyhub et al.) -- those call preventDefault()/stopPropagation() the
              // moment a shortcut's key combo matches, before any of their own callbacks run, so
              // a shortcut bound to e.g. Space/Delete/an arrow key would otherwise swallow that
              // keystroke while the user is just typing a name.
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                onCommit?.();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onDiscard?.();
              }
            }}
            onBlur={() => onDiscard?.()}
          />
        ) : (
          children && <ListItemText>{children}</ListItemText>
        ))}
      {!compact && (
        <AnimatePresence>
          {isHovered && panel != null && (
            <PanelWrapper
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {panel}
            </PanelWrapper>
          )}
        </AnimatePresence>
      )}
    </Root>
  );
};
