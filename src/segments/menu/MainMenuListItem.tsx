import { menu } from '@src/services/menu';
import { useAppSelector } from '@store/hooks';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { load } from '../dialogs/loader/loader';
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
  // The file name the main process gives a file with this title, from bridge/fileNames.ts
  toFileName: (title: string) => string;
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
  toFileName: (title: string) => string
): string | null {
  const trimmed = draft.trim();
  if (!trimmed) return t('shared.nameEmpty');
  if (trimmed.length > MAX_NAME_LENGTH)
    return t('mainMenuListItem.nameTooLong', { maxLength: MAX_NAME_LENGTH });
  const newFileName = toFileName(trimmed);
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
  toFileName,
  compact,
  existingFileNames,
  emoji,
  onEmojiSelect,
  onClick,
  onCommit,
  onDelete,
  onDiscard,
}: MainMenuListItemProps) {
  const renamingKey = useAppSelector(menu.selectRenamingKey);
  const isEditing = fileName === null || renamingKey === itemKey;
  const [draftValue, setDraftValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const committingRef = useRef(false);
  const wasEditingRef = useRef(isEditing);

  const { pushMessage } = useMessageHelmet();

  const setItemRef = useCallback(
    (el: HTMLDivElement | null) => menu.registerItem(itemKey, el),
    [itemKey]
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
      menu.focusItem(itemKey);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, itemKey]);

  const handleChange = (value: string) => {
    setDraftValue(value);
    setError(validate(value, fileName, existingFileNames, toFileName));
  };

  const handleDiscard = () => {
    if (committingRef.current) return;
    if (fileName === null) {
      onDiscard?.();
    } else {
      setDraftValue(title);
      setError(null);
      menu.stopRenaming(itemKey);
    }
  };

  const handleCommit = async () => {
    const validationError = validate(draftValue, fileName, existingFileNames, toFileName);
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
      await load({ messages: [label] }, onCommit(fileName, draftValue));
      setError(null);
      menu.stopRenaming(itemKey);
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
