import { SpellcheckSettings } from '@src/partials/SpellcheckSettings';
import { FormsContent } from '@ui-toolkit/forms';

/** Whether the spellchecker runs */
export function SpellcheckTab() {
  return (
    <FormsContent>
      <SpellcheckSettings />
    </FormsContent>
  );
}
