import CleanCache from '@src/partials/CleanCache';
import SelectFolder from '@src/partials/SelectFolder';
import SelectLanguage from '@src/partials/SelectLanguage';
import { FormsContent, FormsRow } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { OVERLAY_APPEAR_DURATION } from '@src/toolkit/motion/transitions';

/** The working folder, media cache and interface language. The project's tempo and characters are
 * in the Project tab. The time adjustment step and scroll-on-play live in the video player's top bar, and
 * auto-marking completed lines in the editor's control panel. */
export function GeneralTab() {
  return (
    <FormsContent animated delay={OVERLAY_APPEAR_DURATION}>
      <FormsRow animated $columns={2}>
        <SelectFolder />
        <CleanCache />
      </FormsRow>
      <Hr variant={THrVariant.TRANSPARENT} orientation={THrOrient.HORIZONTAL} />
      <FormsRow animated $columns={2}>
        <SelectLanguage />
      </FormsRow>
    </FormsContent>
  );
}
