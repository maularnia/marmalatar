import i18n from '@src/i18n';
import { modal } from '@src/services/modal';
import { TColor } from '@src/theme/definitions';
import { ThemeColors } from '@src/theme/utils';
import { MergeCharactersDialog, RemoveCharacterDialog } from './CharacterPoolDialogs';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmMergeCharacters = (from: string, to: string, color: TColor) =>
  modal.confirm(
    MergeCharactersDialog,
    { from, to, color },
    {
      confirmButton: { children: t('mergeCharacters.confirmButton'), color: ThemeColors.RED },
      dismissButton: { children: t('shared.cancel') },
    }
  );

export const confirmRemoveCharacter = (name: string, color: TColor, lineCount: number) =>
  modal.confirm(
    RemoveCharacterDialog,
    { name, color, lineCount },
    {
      confirmButton: { children: t('removeCharacter.confirmButton'), color: ThemeColors.RED },
      dismissButton: { children: t('shared.cancel') },
    }
  );
