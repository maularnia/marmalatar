import { SpellcheckSettings } from '@src/partials/SpellcheckSettings';
import { FormsContent } from '@ui-toolkit/forms';
import { OVERLAY_APPEAR_DURATION } from '@src/toolkit/motion/transitions';

/** The spellchecker's switch and, while it's on, the user dictionaries */
export function SpellcheckTab() {
  return (
    <FormsContent animated delay={OVERLAY_APPEAR_DURATION}>
      <SpellcheckSettings />
    </FormsContent>
  );
}
