import CleanCache from '@src/partials/CleanCache';
import SelectFolder from '@src/partials/SelectFolder';
import SelectLanguage from '@src/partials/SelectLanguage';
import Settings from '@src/partials/Settings';
import { FormsContent, FormsRow } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';

/** Sync, UI/UX, working folder, media cache and interface language */
export function GeneralTab() {
  return (
    <FormsContent>
      <Settings />
      <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
      <FormsRow $columns={2}>
        <SelectFolder />
        <CleanCache />
      </FormsRow>
      <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
      <FormsRow $columns={2}>
        <SelectLanguage />
      </FormsRow>
    </FormsContent>
  );
}
