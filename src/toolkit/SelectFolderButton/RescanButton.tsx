import { useAppDispatch, useAppSelector } from '@store/hooks';
import { selectWorkingFolderIsBusy, selectFolder } from '@store/slices/workingFolder';
import { forceRescan } from '@store/thunks';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';
import { TButtonVariant } from '../Button/types';

export default function RescanButton() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const folder = useAppSelector(selectFolder);
  const isBusy = useAppSelector(selectWorkingFolderIsBusy);

  return (
    <Button
      style={{ justifySelf: 'flex-start' }}
      type="button"
      variant={TButtonVariant.SECONDARY}
      icon={TIcon.REFRESH}
      disabled={!folder || isBusy}
      onClick={() => void dispatch(forceRescan())}
    >
      {t('workingFolder.rescanButton')}
    </Button>
  );
}
