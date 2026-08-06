import {
  emitAddGlossaryEntryErrorMessage,
  emitAiTranslationJobDoneMessage,
  emitAiTranslationJobFailedMessage,
  emitBulkTranslationFailedMessage,
  emitGlossaryEntryAddedMessage,
  emitGlossaryEntrySaveFailedMessage,
  emitNoMatchingGlossariesMessage,
  emitNoPromptTemplateMessage,
  emitTranslationCancelledMessage,
  emitUnableToTranslateLineMessage,
} from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useAddToGlossaryDialog } from '@src/segments/dialogs/addToGlossary/useAddToGlossaryDialog';
import { useTranslationOverrideConfirmation } from '@src/segments/dialogs/translationOverrride/useTranslationOverrideConfirmation';
import { aiClients } from '@src/services/ai/clients';
import {
  selectAskBeforeAITranslate,
  selectAutoMarkLinesCompleted,
  selectSelectedIntegrationId,
} from '@src/store/slices/app';
import { selectLines, setLineCompleted, updateTranslatedText } from '@src/store/slices/editor';
import {
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
} from '@src/store/slices/project';
import { selectSelectedPromptTemplateFileName } from '@src/store/slices/prompt';
import { ThemeColors } from '@src/theme/utils';
import { providerNoop } from '@src/utils/noop';
import { useAppDispatch } from '@store/hooks';
import { fromCurrentStore } from '@store/store';
import {
  startAutomatedBulkTranslation,
  startAutomatedTranslation,
} from '@store/slices/aiTranslation';
import { selectGlossaryItems } from '@store/slices/disc';
import { addEntryToGlossary } from '@store/thunks';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize } from '@ui-toolkit/Tag';
import { createContext, PropsWithChildren, useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type EditorAIActionsContextType = {
  handleAiTranslate: (lineNo: number) => void;
  handleAiTranslateBulk: () => void;
  handleAddToGlossary: (selectedText: string) => void;
};

const noop = providerNoop('EditorAIActionsContext');

const EditorAIActionsContext = createContext<EditorAIActionsContextType>({
  handleAiTranslate: noop,
  handleAiTranslateBulk: noop,
  handleAddToGlossary: noop,
});

export function useEditorAIActions(): EditorAIActionsContextType {
  return useContext(EditorAIActionsContext);
}

export default function EditorAIActionsProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation(['messages', 'dialogs']);
  const dispatch = useAppDispatch();
  const { pushMessage } = useMessageHelmet();
  const { addToGlossary } = useAddToGlossaryDialog();
  const { confirmTranslationOverride } = useTranslationOverrideConfirmation();

  const isPromptTemplateSelected = useCallback((): boolean => {
    const selectedIntegrationId = fromCurrentStore(selectSelectedIntegrationId);
    const client = selectedIntegrationId
      ? aiClients[selectedIntegrationId as keyof typeof aiClients]
      : undefined;
    const selectedPromptTemplateFileName = fromCurrentStore(selectSelectedPromptTemplateFileName);
    if (client?.supportsContext && !selectedPromptTemplateFileName) {
      emitNoPromptTemplateMessage(pushMessage);
      return false;
    }
    return true;
  }, [pushMessage]);

  const handleAiTranslate = useCallback(
    async (lineIndex: number) => {
      if (!isPromptTemplateSelected()) return;

      const line = fromCurrentStore(selectLines)[lineIndex];
      const outputNotEmpty = Boolean(line?.output?.trim());
      if (outputNotEmpty || fromCurrentStore(selectAskBeforeAITranslate)) {
        let confirmed: boolean;
        try {
          confirmed = await confirmTranslationOverride({
            text: outputNotEmpty
              ? t('dialogs:translationOverride.bodyHasContent')
              : t('dialogs:translationOverride.bodyWillTranslate'),
          });
        } catch {
          emitUnableToTranslateLineMessage(pushMessage);
          return;
        }
        if (!confirmed) {
          emitTranslationCancelledMessage(pushMessage);
          return;
        }
      }

      try {
        await dispatch(startAutomatedTranslation(lineIndex));
        emitAiTranslationJobDoneMessage(pushMessage);
      } catch (err) {
        emitAiTranslationJobFailedMessage(
          pushMessage,
          err instanceof Error
            ? err.message
            : 'Unexpected critical error while performing AI translation'
        );
      }
    },
    [confirmTranslationOverride, dispatch, pushMessage, isPromptTemplateSelected]
  );

  const handleAiTranslateBulk = useCallback(() => {
    const selectedIntegrationId = fromCurrentStore(selectSelectedIntegrationId);
    if (!selectedIntegrationId) return;
    if (!isPromptTemplateSelected()) return;
    const translationLines = fromCurrentStore(selectLines);
    const autoMarkLinesCompleted = fromCurrentStore(selectAutoMarkLinesCompleted);
    const lines = translationLines.filter((line) => !line.output);
    if (!lines.length) return;
    try {
      dispatch(
        startAutomatedBulkTranslation({
          lines,
          onChunkTranslated: ({ results }) => {
            results.forEach(({ line, translatedText }) => {
              const lineIndex = translationLines.indexOf(line);
              if (lineIndex >= 0) {
                dispatch(updateTranslatedText({ lineIndex, text: translatedText }));
                if (autoMarkLinesCompleted)
                  dispatch(
                    setLineCompleted({
                      lineIndex,
                      completed: Boolean(translatedText),
                      skipHistory: true,
                    })
                  );
              }
            });
          },
          onChunkError: ({ error }) => {
            emitBulkTranslationFailedMessage(pushMessage, error.message);
          },
        })
      );
    } catch (err) {
      emitBulkTranslationFailedMessage(
        pushMessage,
        err instanceof Error ? err.message : 'How did you get here? [UNREACHABLE 02]'
      );
    }
  }, [isPromptTemplateSelected, dispatch, pushMessage]);

  const handleAddToGlossary = useCallback(
    async (selectedText: string) => {
      const text = selectedText.trim();
      if (!text) return;

      const sourceLanguage = fromCurrentStore(selectProjectSourceLanguage);
      const targetLanguage = fromCurrentStore(selectProjectTargetLanguage);
      const filteredGlossaries = fromCurrentStore(selectGlossaryItems).filter(
        (g) => g.sourceLanguage === sourceLanguage && g.targetLanguage === targetLanguage
      );
      if (!filteredGlossaries.length) {
        emitNoMatchingGlossariesMessage(pushMessage);
        return;
      }

      try {
        const result = await addToGlossary({
          defaultOriginal: text,
          glossaryOptions: filteredGlossaries,
        });
        if (result) {
          const added = await (dispatch(
            addEntryToGlossary(
              { original: result.pair[0], translation: result.pair[1] },
              result.glossaryFileName
            )
          ) as Promise<boolean>);
          if (added) {
            emitGlossaryEntryAddedMessage(
              pushMessage,
              <>
                <Tag color={ThemeColors.TEXT} size={TTagSize.SMALL}>
                  {result.pair[0]}
                </Tag>
                <Icon icon={TIcon.ARROW_RIGHT} size={TIconSize.S} />
                <Tag color={ThemeColors.TEXT} size={TTagSize.SMALL}>
                  {result.pair[1]}
                </Tag>{' '}
                {t('glossaryEntryAdded.suffix')}
              </>
            );
          } else {
            emitGlossaryEntrySaveFailedMessage(pushMessage);
          }
        }
      } catch (e) {
        emitAddGlossaryEntryErrorMessage(
          pushMessage,
          e instanceof Error
            ? e.message
            : 'Critical unexpected error white adding entry to a glossary'
        );
      }
    },
    [addToGlossary, dispatch, pushMessage]
  );

  const value = useMemo<EditorAIActionsContextType>(
    () => ({ handleAiTranslate, handleAiTranslateBulk, handleAddToGlossary }),
    [handleAiTranslate, handleAiTranslateBulk, handleAddToGlossary]
  );

  return (
    <EditorAIActionsContext.Provider value={value}>{children}</EditorAIActionsContext.Provider>
  );
}
