import { menu } from '@src/services/menu';
import { TColor } from '@src/theme/definitions';
import { ThemeColors } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import Emoji from '@ui-toolkit/Emoji';
import EmoPicker from '@ui-toolkit/EmoPicker';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import { useCallback, useEffect, useRef } from 'react';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint, TooltipSimple } from '@src/toolkit/Tooltip';
import { useTranslation } from 'react-i18next';

type MainMenuListItemProps = {
  itemKey: string;
  title: string;
  /** Whether the title is being edited (renamed, or typed for a new file). The consumer decides. */
  isEditing: boolean;
  /** Whether the name being typed can be committed; shown as the error state while editing */
  isValid: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  color?: TColor;
  progress?: number;
  emoji?: string;
  compact?: boolean;
  onEmojiSelect?: (emoji: string) => void;
  /** Shows the archive action first in the panel (projects only) */
  onArchive?: () => void;
  onClick?: () => void;
  /** Editing only: the name as typed, the commit (Enter) and the discard (Escape, blur) */
  onChange?: (name: string) => void;
  onCommit?: () => void;
  onDiscard?: () => void;
  onDelete?: () => void;
};

// A menu row for a file. Controlled: the consumer owns whether it's edited, the typed name and its
// validity, and what committing or discarding does. The row keeps only DOM concerns -- its element
// in the menu's registry, and focus going back to it when an edit ends.
export function MainMenuListItem({
  itemKey,
  title,
  isEditing,
  isValid,
  isActive,
  isDisabled,
  color,
  progress,
  compact,
  emoji,
  onEmojiSelect,
  onArchive,
  onClick,
  onChange,
  onCommit,
  onDiscard,
  onDelete,
}: MainMenuListItemProps) {
  const { t: tMenu } = useTranslation('menu');
  const wasEditingRef = useRef(isEditing);

  const setItemRef = useCallback(
    (el: HTMLDivElement | null) => menu.registerItem(itemKey, el),
    [itemKey]
  );

  useEffect(() => {
    // Rename just ended (commit or cancel) -- the contentEditable it was in is gone, so the row
    // itself should regain focus rather than leaving focus wherever the browser defaults it to.
    if (wasEditingRef.current && !isEditing) {
      menu.focusItem(itemKey);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, itemKey]);

  return (
    <ListItem
      ref={setItemRef}
      isActive={isActive && !isEditing}
      isDisabled={isDisabled}
      isFocused={isEditing}
      isError={isEditing && !isValid}
      color={color}
      progress={progress}
      compact={compact}
      onClick={isEditing ? undefined : onClick}
      onChange={isEditing ? onChange : undefined}
      onCommit={isEditing ? onCommit : undefined}
      onDiscard={isEditing ? onDiscard : undefined}
      emoji={
        emoji != null && onEmojiSelect ? (
          <EmoPicker side="right" onEmojiSelect={onEmojiSelect}>
            <Emoji onClick={(e) => e.stopPropagation()}>{emoji}</Emoji>
          </EmoPicker>
        ) : undefined
      }
      panel={
        isEditing || isDisabled ? undefined : (
          <>
            {onArchive != null && (
              <Tooltip label={<TooltipSimple>{tMenu('archive.archiveButton')}</TooltipSimple>}>
                <Button
                  variant={TButtonVariant.TRANSPARENT}
                  size={TButtonSize.NANO}
                  icon={TIcon.ARCHIVE}
                  color={isActive ? ThemeColors.BG : ThemeColors.TEXT}
                  onClick={(e) => {
                    // The row itself would open the project
                    e.stopPropagation();
                    onArchive();
                  }}
                />
              </Tooltip>
            )}
            <Tooltip
              label={
                <TooltipComplex title={'Rename'}>
                  <TooltipKeystrokeHint keys={['Ctrl', 'R']} />
                </TooltipComplex>
              }
            >
              <Button
                variant={TButtonVariant.TRANSPARENT}
                size={TButtonSize.NANO}
                icon={TIcon.EDIT}
                color={isActive ? ThemeColors.BG : ThemeColors.TEXT}
                onClick={(e) => {
                  e.stopPropagation();
                  menu.startRenaming(itemKey);
                }}
              />
            </Tooltip>
            {onDelete != null && (
              <Tooltip
                label={
                  <TooltipComplex title={'Delete'}>
                    <TooltipKeystrokeHint keys={['Del / ⌫']} />
                  </TooltipComplex>
                }
              >
                <Button
                  variant={TButtonVariant.TRANSPARENT}
                  color={isActive ? ThemeColors.BG : ThemeColors.TEXT}
                  size={TButtonSize.NANO}
                  icon={TIcon.BIN}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                />
              </Tooltip>
            )}
          </>
        )
      }
    >
      {/* The editor is filled from it when editing starts; typing goes to onChange */}
      {title}
    </ListItem>
  );
}
