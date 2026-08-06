import { useCallback, useRef } from 'react';
import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import GlossaryPairForm, { GlossaryPairFormFields } from './GlossaryPairForm';
import i18n from '@src/i18n';
import { emitGlossaryPairAddedMessage, emitGlossaryPairDiscardedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { ThemeColors } from '@src/theme/utils';
import { TGlossaryFileEntry } from '@src/utils/data/discIO';

const t = i18n.getFixedT(null, 'dialogs');

type TGlossaryPair = [original: string, translated: string];

type TAddToGlossaryResult = {
  pair: TGlossaryPair;
  glossaryFileName: string;
} | null;

type TAddToGlossaryProps = {
  defaultOriginal?: string;
  defaultTranslation?: string;
  glossaryOptions?: TGlossaryFileEntry[];
};

export function useAddToGlossaryDialog() {
  const getValuesRef = useRef<(() => GlossaryPairFormFields) | null>(null);
  const isValidRef = useRef(false);
  const glossaryFileNameRef = useRef<string>('');
  const { pushMessage } = useMessageHelmet();
  const { confirm, destroy } = useConfirm(GlossaryPairForm, {
    confirmButton: { children: t('addToGlossary.confirmButton'), color: ThemeColors.GREEN },
    dismissButton: { children: t('addToGlossary.dismissButton') },
  });

  const addToGlossary = useCallback(
    async ({
      defaultOriginal,
      defaultTranslation,
      glossaryOptions,
    }: TAddToGlossaryProps): Promise<TAddToGlossaryResult> => {
      getValuesRef.current = null;
      isValidRef.current = false;

      const options = (glossaryOptions ?? []).map((g) => ({
        value: g.fileName,
        label: g.title,
      }));

      glossaryFileNameRef.current = options[0]?.value ?? '';

      return await confirm(
        {
          defaultOriginal,
          defaultTranslation,
          glossaryOptions: options,
          defaultGlossaryFileName: glossaryFileNameRef.current,
          onValidChange: (isValid) => (isValidRef.current = isValid),
          onFormReady: (getValues) => (getValuesRef.current = getValues),
          onGlossaryChange: (fileName) => (glossaryFileNameRef.current = fileName),
        },
        () => isValidRef.current
      ).then((confirmed) => {
        if (!confirmed) {
          emitGlossaryPairDiscardedMessage(pushMessage);
          return null;
        }
        if (!getValuesRef.current) return null;
        const { original, translation } = getValuesRef.current();
        const result: TAddToGlossaryResult = {
          pair: [original.trim(), translation.trim()],
          glossaryFileName: glossaryFileNameRef.current,
        };
        emitGlossaryPairAddedMessage(
          pushMessage,
          original,
          translation,
          glossaryFileNameRef.current
        );
        return result;
      });
    },
    [confirm, pushMessage]
  );

  return { addToGlossary, destroy };
}
