import { modal } from '@src/services/modal';
import { toast } from '@src/services/toast';
import i18n from '@src/i18n';
import {
  makeGlossaryPairAddedMessage,
  makeGlossaryPairDiscardedMessage,
} from '@src/services/glossary/toasts';
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

  const confirmed = await modal.confirm(
    GlossaryPairForm,
    {
      defaultOriginal,
      defaultTranslation,
      glossaryOptions: options,
      defaultGlossaryFileName: glossaryFileName,
      onValidChange: (valid) => (isValid = valid),
      onFormReady: (next) => (getValues = next),
      onGlossaryChange: (fileName) => (glossaryFileName = fileName),
    },
    {
      confirmButton: { children: t('addToGlossary.confirmButton'), color: ThemeColors.GREEN },
      dismissButton: { children: t('addToGlossary.dismissButton') },
      validate: () => isValid,
    }
  );
  if (!confirmed) {
    toast.push(makeGlossaryPairDiscardedMessage());
    return null;
  }
  // TS narrows `getValues` to `null` here, not seeing the assignment inside the callback.
  const readValues = getValues as (() => GlossaryPairFormFields) | null;
  if (!readValues) return null;
  const { original, translation } = readValues();
  toast.push(makeGlossaryPairAddedMessage(original, translation, glossaryFileName));
  return { pair: [original.trim(), translation.trim()], glossaryFileName };
}
