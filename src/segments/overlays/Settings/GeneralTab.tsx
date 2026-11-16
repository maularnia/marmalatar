import CleanCache from '@src/partials/CleanCache';
import SelectFolder from '@src/partials/SelectFolder';
import SelectLanguage from '@src/partials/SelectLanguage';
import Settings from '@src/partials/Settings';
import TempoSettings from '@src/partials/TempoSettings';
import { FormsContent, FormsRow } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { OVERLAY_APPEAR_DURATION } from '@src/toolkit/motion/transitions';

/** Sync, the open project's tempo (subtitle limits), UI/UX, working folder, media cache and
 * interface language */
export function GeneralTab() {
  return (
    <FormsContent animated delay={OVERLAY_APPEAR_DURATION}>
      <Settings />
      <TempoSettings />
      <Hr variant={THrVariant.TRANSPARENT} orientation={THrOrient.HORIZONTAL} />
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
