import { createConfirm } from '@providers/bridges/confirmation';
import { pushMessage } from '@providers/bridges/messages';
import i18n from '@src/i18n';
import { emitGlossaryPairAddedMessage, emitGlossaryPairDiscardedMessage } from '@src/messages';
import { ThemeColors } from '@src/theme/utils';
import GlossaryPairForm, { GlossaryPairFormFields } from './GlossaryPairForm';

const t = i18n.getFixedT(null, 'dialogs');

type TGlossaryPair = [original: string, translated: string];

type TAddToGlossaryResult = {
  pair: TGlossaryPair;
  glossaryFileName: string;
} | null;

type TAddToGlossaryProps = {
  defaultOriginal?: string;
  defaultTranslation?: string;
  // Structural rather than `TGlossaryEntry`: the glossary service opens this dialog, so importing
  // its types here would be an import cycle.
  glossaryOptions?: { fileName: string; title: string }[];
};

const addToGlossaryWindow = createConfirm(GlossaryPairForm, {
  confirmButton: { children: t('addToGlossary.confirmButton'), color: ThemeColors.GREEN },
  dismissButton: { children: t('addToGlossary.dismissButton') },
});

/** Asks for a glossary pair and the glossary to add it to; resolves `null` when dismissed. */
export async function askForGlossaryPair({
  defaultOriginal,
  defaultTranslation,
  glossaryOptions,
}: TAddToGlossaryProps): Promise<TAddToGlossaryResult> {
  let getValues: (() => GlossaryPairFormFields) | null = null;
  let isValid = false;

  const options = (glossaryOptions ?? []).map((g) => ({
    value: g.fileName,
    label: g.title,
  }));

  let glossaryFileName = options[0]?.value ?? '';

  const confirmed = await addToGlossaryWindow.confirm(
    {
      defaultOriginal,
      defaultTranslation,
      glossaryOptions: options,
      defaultGlossaryFileName: glossaryFileName,
      onValidChange: (valid) => (isValid = valid),
      onFormReady: (next) => (getValues = next),
      onGlossaryChange: (fileName) => (glossaryFileName = fileName),
    },
    () => isValid
  );
  if (!confirmed) {
    emitGlossaryPairDiscardedMessage(pushMessage);
    return null;
  }
  // TS narrows `getValues` to `null` here, not seeing the assignment inside the callback.
  const readValues = getValues as (() => GlossaryPairFormFields) | null;
  if (!readValues) return null;
  const { original, translation } = readValues();
  emitGlossaryPairAddedMessage(pushMessage, original, translation, glossaryFileName);
  return { pair: [original.trim(), translation.trim()], glossaryFileName };
}
