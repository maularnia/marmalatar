import { useAppSelectors } from '@store/hooks';
import { folder } from '@src/services/folder';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';
import { TButtonVariant } from '../Button/types';

export default function RescanButton() {
  const { t } = useTranslation('settings');
  const [folderPath, isBusy] = useAppSelectors(folder.selectPath, folder.selectIsBusy);

  return (
    <Button
      style={{ justifySelf: 'flex-start' }}
      type="button"
      variant={TButtonVariant.SECONDARY}
      icon={TIcon.REFRESH}
      disabled={!folderPath || isBusy}
      onClick={() => void folder.scan()}
    >
      {t('workingFolder.rescanButton')}
    </Button>
  );
}
