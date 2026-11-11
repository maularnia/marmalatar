import { GlobalDictionaries } from '@src/partials/GlobalDictionaries';
import { SpellcheckSettings } from '@src/partials/SpellcheckSettings';
import { FormsContent } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';

/** Whether the spellchecker runs, and the global dictionaries' words */
export function SpellcheckTab() {
  return (
    <FormsContent>
      <SpellcheckSettings />
      <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
      <GlobalDictionaries />
    </FormsContent>
  );
}
