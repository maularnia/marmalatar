import { useAppSelectors } from '@store/hooks';
import { workingFolder } from '@store/slices/workingFolder';
import { app } from '@store/thunks';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';
import { TButtonVariant } from '../Button/types';

export default function RescanButton() {
  const { t } = useTranslation('settings');
  const [folder, isBusy] = useAppSelectors(workingFolder.selectFolder, workingFolder.selectIsBusy);

  return (
    <Button
      style={{ justifySelf: 'flex-start' }}
      type="button"
      variant={TButtonVariant.SECONDARY}
      icon={TIcon.REFRESH}
      disabled={!folder || isBusy}
      onClick={() => void app.workingFolderScan()}
    >
      {t('workingFolder.rescanButton')}
    </Button>
  );
}
