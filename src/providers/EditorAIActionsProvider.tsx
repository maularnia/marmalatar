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
import { useEditorRefs } from '@providers/EditorRefsProvider';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useAddToGlossaryDialog } from '@src/segments/dialogs/addToGlossary/useAddToGlossaryDialog';
import { useTranslationOverrideConfirmation } from '@src/segments/dialogs/translationOverrride/useTranslationOverrideConfirmation';
import { aiClients } from '@src/services/ai/clients';
import { settings } from '@src/store/slices/settings';
import { editor } from '@src/store/slices/editor';
import { projects } from '@src/store/slices/project';
import { prompt } from '@src/store/slices/prompt';
import { ThemeColors } from '@src/theme/utils';
import { providerNoop } from '@src/utils/noop';
import { useMemoizedObject } from '@src/utils/useMemoizedObject';
import { ai } from '@store/slices/ai';
import { glossaries } from '@store/slices/aiPromptEditor';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize } from '@ui-toolkit/Tag';
import { createContext, PropsWithChildren, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';

type TEditorAIActionsContext = {
  handleAiTranslate: (lineNo: number) => void;
  handleAiTranslateBulk: () => void;
  handleAddToGlossary: (selectedText: string) => void;
  handleAddSelectionToGlossary: (lineIndex: number) => void;
};

const noop = providerNoop('EditorAIActionsContext');

const EditorAIActionsContext = createContext<TEditorAIActionsContext>({
  handleAiTranslate: noop,
  handleAiTranslateBulk: noop,
  handleAddToGlossary: noop,
  handleAddSelectionToGlossary: noop,
});

export function useEditorAIActions(): TEditorAIActionsContext {
  return useContext(EditorAIActionsContext);
}

export function EditorAIActionsProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation(['messages', 'dialogs']);
  const { lineInputRefs } = useEditorRefs();
  const { pushMessage } = useMessageHelmet();
  const { addToGlossary } = useAddToGlossaryDialog();
  const { confirmTranslationOverride } = useTranslationOverrideConfirmation();

  const isPromptTemplateSelected = useCallback((): boolean => {
    const selectedIntegrationId = settings.get.selectedIntegrationId();
    const client = selectedIntegrationId
      ? aiClients[selectedIntegrationId as keyof typeof aiClients]
      : undefined;
    const selectedPromptTemplateFileName = prompt.get.selectedPromptTemplateFileName();
    if (client?.supportsContext && !selectedPromptTemplateFileName) {
      emitNoPromptTemplateMessage(pushMessage);
      return false;
    }
    return true;
  }, [pushMessage]);

  const handleAiTranslate = useCallback(
    async (lineIndex: number) => {
      if (!isPromptTemplateSelected()) return;

      const line = editor.get.lines()[lineIndex];
      const outputNotEmpty = Boolean(line?.output?.trim());
      if (outputNotEmpty || settings.get.askBeforeAITranslate()) {
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
        await ai.startAutomated(lineIndex);
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
    [confirmTranslationOverride, pushMessage, isPromptTemplateSelected]
  );

  const handleAiTranslateBulk = useCallback(() => {
    const selectedIntegrationId = settings.get.selectedIntegrationId();
    if (!selectedIntegrationId) return;
    if (!isPromptTemplateSelected()) return;
    const translationLines = editor.get.lines();
    const autoMarkLinesCompleted = settings.get.autoMarkLinesCompleted();
    const lines = translationLines.filter((line) => !line.output);
    if (!lines.length) return;
    try {
      ai.startAutomatedBulk({
        lines,
        onChunkTranslated: ({ results }) => {
          results.forEach(({ line, translatedText }) => {
            const lineIndex = translationLines.indexOf(line);
            if (lineIndex >= 0) {
              editor.updateTranslatedText({ lineIndex, text: translatedText });
              if (autoMarkLinesCompleted)
                editor.setLineCompleted({
                  lineIndex,
                  completed: Boolean(translatedText),
                  skipHistory: true,
                });
            }
          });
        },
        onChunkError: ({ error }) => {
          emitBulkTranslationFailedMessage(pushMessage, error.message);
        },
      });
    } catch (err) {
      emitBulkTranslationFailedMessage(
        pushMessage,
        err instanceof Error ? err.message : 'How did you get here? [UNREACHABLE 02]'
      );
    }
  }, [isPromptTemplateSelected, pushMessage]);

  const handleAddToGlossary = useCallback(
    async (selectedText: string) => {
      const text = selectedText.trim();
      if (!text) return;

      const sourceLanguage = projects.get.sourceLanguage();
      const targetLanguage = projects.get.targetLanguage();
      const filteredGlossaries = glossaries.get
        .items()
        .filter((g) => g.sourceLanguage === sourceLanguage && g.targetLanguage === targetLanguage);
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
          const added = await (glossaries.addEntry(
            { original: result.pair[0], translation: result.pair[1] },
            result.glossaryFileName
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
    [addToGlossary, pushMessage]
  );

  const handleAddSelectionToGlossary = useCallback(
    (lineIndex: number) => {
      const sourceInput = lineInputRefs.current.get(lineIndex)?.source ?? null;
      if (!sourceInput) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      if (!sourceInput.contains(range.commonAncestorContainer)) return;
      const selectedText = selection.toString();
      if (!selectedText.trim()) return;
      handleAddToGlossary(selectedText);
    },
    [handleAddToGlossary, lineInputRefs]
  );

  const value = useMemoizedObject<TEditorAIActionsContext>({
    handleAiTranslate,
    handleAiTranslateBulk,
    handleAddToGlossary,
    handleAddSelectionToGlossary,
  });

  return (
    <EditorAIActionsContext.Provider value={value}>{children}</EditorAIActionsContext.Provider>
  );
}
