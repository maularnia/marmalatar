import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { useMenuActions } from '@providers/MenuActionsProvider';
import { useMenuRefs } from '@providers/MenuRefsProvider';
import i18n from '@src/i18n';
import { emitFileProcessingFailedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { TColor } from '@src/theme/definitions';
import { ThemeColors } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import Emoji from '@ui-toolkit/Emoji';
import EmoPicker from '@ui-toolkit/EmoPicker';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import { toSlug } from '@utils/string';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader } from '../dialogs/Loader';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@src/toolkit/Tooltip';

const MAX_NAME_LENGTH = 64;
const t = i18n.getFixedT(null, 'errors');
const tMessages = i18n.getFixedT(null, 'messages');

type MainMenuListItemProps = {
  itemKey: string;
  fileName: string | null;
  title: string;
  isActive?: boolean;
  isDisabled?: boolean;
  color?: TColor;
  progress?: number;
  fileExtension: string;
  slugFallback: string;
  existingFileNames: string[];
  emoji?: string;
  compact?: boolean;
  onEmojiSelect?: (emoji: string) => void;
  onClick?: () => void;
  onCommit: (fileName: string | null, newTitle: string) => Promise<void>;
  onDelete?: (fileName: string, title: string) => void;
  onDiscard?: () => void;
};

function validate(
  draft: string,
  fileName: string | null,
  existingFileNames: string[],
  fileExtension: string,
  slugFallback: string
): string | null {
  const trimmed = draft.trim();
  if (!trimmed) return t('shared.nameEmpty');
  if (trimmed.length > MAX_NAME_LENGTH)
    return t('mainMenuListItem.nameTooLong', { maxLength: MAX_NAME_LENGTH });
  const newFileName = `${toSlug(trimmed, slugFallback)}${fileExtension}`;
  if (newFileName !== fileName && existingFileNames.includes(newFileName)) {
    return t('mainMenuListItem.nameAlreadyExists');
  }
  return null;
}

export function MainMenuListItem({
  itemKey,
  fileName,
  title,
  isActive,
  isDisabled,
  color,
  progress,
  fileExtension,
  slugFallback,
  compact,
  existingFileNames,
  emoji,
  onEmojiSelect,
  onClick,
  onCommit,
  onDelete,
  onDiscard,
}: MainMenuListItemProps) {
  const { renamingKey, handleStartRenaming, handleStopRenaming, handleFocusMenuItem } =
    useMenuActions();
  const { registerMenuItemRef } = useMenuRefs();
  const isEditing = fileName === null || renamingKey === itemKey;
  const [draftValue, setDraftValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const committingRef = useRef(false);
  const wasEditingRef = useRef(isEditing);

  const { pushMessage } = useMessageHelmet();
  const { show: showLoading } = useInfoWindow(Loader);

  const setItemRef = useCallback(
    (el: HTMLDivElement | null) => registerMenuItemRef(itemKey, el),
    [itemKey, registerMenuItemRef]
  );

  useEffect(() => {
    if (isEditing) {
      setDraftValue(title);
      setError(null);
    }
    // Only reset when entering edit mode (via pencil click or the alt+r keystroke) -- not on
    // every title change, which would clobber in-progress typing.
  }, [isEditing]);

  useEffect(() => {
    // Rename just ended (commit or cancel) -- the contentEditable it was in is gone, so the row
    // itself should regain focus rather than leaving focus wherever the browser defaults it to.
    if (wasEditingRef.current && !isEditing) {
      handleFocusMenuItem(itemKey);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, itemKey, handleFocusMenuItem]);

  const handleChange = (value: string) => {
    setDraftValue(value);
    setError(validate(value, fileName, existingFileNames, fileExtension, slugFallback));
  };

  const handleDiscard = () => {
    if (committingRef.current) return;
    if (fileName === null) {
      onDiscard?.();
    } else {
      setDraftValue(title);
      setError(null);
      handleStopRenaming(itemKey);
    }
  };

  const handleCommit = async () => {
    const validationError = validate(
      draftValue,
      fileName,
      existingFileNames,
      fileExtension,
      slugFallback
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    committingRef.current = true;
    const label =
      fileName === null
        ? tMessages('mainMenuListItem.creatingNewFile')
        : tMessages('mainMenuListItem.renamingFile');

    try {
      await showLoading({ message: label, animate: false }, onCommit(fileName, draftValue));
      setError(null);
      handleStopRenaming(itemKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('mainMenuListItem.unreachableCommitError');
      setError(msg);
      emitFileProcessingFailedMessage(pushMessage, msg);
    } finally {
      committingRef.current = false;
    }
  };

  return (
    <ListItem
      ref={setItemRef}
      isActive={isActive && !isEditing}
      isDisabled={isDisabled}
      isFocused={isEditing}
      isError={!!error}
      color={color}
      progress={progress}
      compact={compact}
      onClick={isEditing ? undefined : onClick}
      onChange={isEditing ? handleChange : undefined}
      onCommit={isEditing ? handleCommit : undefined}
      onDiscard={isEditing ? handleDiscard : undefined}
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
                color={ThemeColors.TEXT}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartRenaming(itemKey);
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
                  color={ThemeColors.TEXT}
                  size={TButtonSize.NANO}
                  icon={TIcon.BIN}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fileName) onDelete(fileName, title);
                  }}
                />
              </Tooltip>
            )}
          </>
        )
      }
    >
      {isEditing ? draftValue : title}
    </ListItem>
  );
}
