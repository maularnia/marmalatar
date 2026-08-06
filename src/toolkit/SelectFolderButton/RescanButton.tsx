import { useAppDispatch, useAppSelector } from '@store/hooks';
import { forceRescan, selectDiscIsBusy, selectFolder } from '@store/slices/disc';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';
import { TButtonVariant } from '../Button/types';

export default function RescanButton() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const folder = useAppSelector(selectFolder);
  const isBusy = useAppSelector(selectDiscIsBusy);

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
