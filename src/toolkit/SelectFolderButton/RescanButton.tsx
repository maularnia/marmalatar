import { useAppDispatch, useAppSelector } from '@store/hooks';
import { workingFolder } from '@store/slices/workingFolder';
import { workingFolderScan } from '@store/thunks';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';
import { TButtonVariant } from '../Button/types';

export default function RescanButton() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const folder = useAppSelector(workingFolder.selectFolder);
  const isBusy = useAppSelector(workingFolder.selectIsBusy);

  return (
    <Button
      style={{ justifySelf: 'flex-start' }}
      type="button"
      variant={TButtonVariant.SECONDARY}
      icon={TIcon.REFRESH}
      disabled={!folder || isBusy}
      onClick={() => void dispatch(workingFolderScan())}
    >
      {t('workingFolder.rescanButton')}
    </Button>
  );
}
