import { SpellcheckSettings } from '@src/partials/SpellcheckSettings';
import { FormsContent } from '@ui-toolkit/forms';

/** The spellchecker's switch and, while it's on, the user dictionaries */
export function SpellcheckTab() {
  return (
    <FormsContent>
      <SpellcheckSettings />
    </FormsContent>
  );
}
