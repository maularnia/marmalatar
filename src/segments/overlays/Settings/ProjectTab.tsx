import CharacterPoolSettings from '@src/partials/CharacterPoolSettings';
import TempoSettings from '@src/partials/TempoSettings';
import { FormsContent } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { OVERLAY_APPEAR_DURATION } from '@src/toolkit/motion/transitions';

/** The open project's own settings: its tempo (subtitle limits) and its characters. The same
 * sections the editor aside shows. */
export function ProjectTab() {
  return (
    <FormsContent animated delay={OVERLAY_APPEAR_DURATION}>
      <TempoSettings />
      <Hr variant={THrVariant.TRANSPARENT} orientation={THrOrient.HORIZONTAL} />
      <CharacterPoolSettings />
    </FormsContent>
  );
}
