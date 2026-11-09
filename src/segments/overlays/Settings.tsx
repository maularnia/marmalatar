import { settings } from '@src/services/settings';
import AiSettings from '@src/partials/AiSettings';
import CleanCache from '@src/partials/CleanCache';
import SelectFolder from '@src/partials/SelectFolder';
import SelectLanguage from '@src/partials/SelectLanguage';
import Settings from '@src/partials/Settings';
import { FormRoot, FormsContent, FormsRow } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { useTranslation } from 'react-i18next';
import Overlay from './Overlay';

export default function SettingsOverlay() {
  const { t } = useTranslation('settings');
  return (
    <Overlay title={t('overlayTitle')} onClose={() => settings.close()}>
      <FormRoot>
        <FormsContent>
          <Settings />
          <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
          <AiSettings />
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
      </FormRoot>
    </Overlay>
  );
}
