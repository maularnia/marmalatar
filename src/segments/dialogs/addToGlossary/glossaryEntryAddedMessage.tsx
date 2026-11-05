import { pushMessage } from '@providers/bridges/messages';
import i18n from '@src/i18n';
import { emitGlossaryEntryAddedMessage } from '@src/messages';
import { ThemeColors } from '@src/theme/utils';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize } from '@ui-toolkit/Tag';

const t = i18n.getFixedT(null, 'messages');

// Kept apart from src/messages.ts because it renders the pair (original → translation) as tags,
// so the glossary service can report it without importing UI components itself.
export function emitGlossaryPairSavedMessage(original: string, translation: string): void {
  emitGlossaryEntryAddedMessage(
    pushMessage,
    <>
      <Tag color={ThemeColors.TEXT} size={TTagSize.SMALL}>
        {original}
      </Tag>
      <Icon icon={TIcon.ARROW_RIGHT} size={TIconSize.S} />
      <Tag color={ThemeColors.TEXT} size={TTagSize.SMALL}>
        {translation}
      </Tag>{' '}
      {t('glossaryEntryAdded.suffix')}
    </>
  );
}
