import i18n from '@src/i18n';
import type { TToastParams } from '@src/services/toast';
import { TMessageType } from '@src/types';
import { ThemeColors } from '@src/theme/utils';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize } from '@ui-toolkit/Tag';
import type { ReactNode } from 'react';

// The glossary service's toasts: each builder returns a toast's params, translated when it's called,
// for the caller to show with toast.push(...).

const t = i18n.getFixedT(null, 'messages');
const tErrors = i18n.getFixedT(null, 'errors');

export function makeGlossaryPairAddedMessage(
  original: string,
  translation: string,
  glossaryFileName: string
): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('glossaryPairAdded.title'),
    message: t('glossaryPairAdded.message', { original, translation, glossaryFileName }),
  };
}

export function makeGlossaryPairDiscardedMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('glossaryPairDiscarded.title'),
    message: t('glossaryPairDiscarded.message'),
  };
}

export function makeNoMatchingGlossariesMessage(): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('noMatchingGlossaries.title'),
    message: tErrors('noMatchingGlossaries.message'),
  };
}

function makeGlossaryEntryAddedMessage(message: ReactNode): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('glossaryEntryAdded.title'),
    message,
  };
}

export function makeGlossaryEntrySaveFailedMessage(): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('glossaryEntrySaveFailed.title'),
    message: tErrors('glossaryEntrySaveFailed.message'),
  };
}

export function makeAddGlossaryEntryErrorMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('addGlossaryEntryError.title'),
    message,
  };
}

// Renders the pair (original → translation) as tags
export function makeGlossaryPairSavedMessage(original: string, translation: string): TToastParams {
  return makeGlossaryEntryAddedMessage(
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
