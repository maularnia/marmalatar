import { useAppDispatch, useAppSelector } from '@store/hooks';
import { selectFolder } from '@store/slices/disc';
import { pickFolder } from '@store/thunks';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TButtonVariant } from '../Button/types';
import Message, { TMessageSize, TMessageVariant } from '../Message';
import { ThemeColors } from '@src/theme/utils';

export default function SelectFolderButton() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const folder = useAppSelector(selectFolder);

  const handleSelectFolder = async () => {
    const didPickFolder = await dispatch(pickFolder());
    if (didPickFolder) navigate('/');
  };

  return (
    <>
      <Button
        style={{ justifySelf: 'flex-start' }}
        type="button"
        variant={TButtonVariant.SPECIAL}
        icon={TIcon.FOLDER_FAVORITE}
        onClick={() => void handleSelectFolder()}
      >
        {t('workingFolder.selectButton')}
      </Button>
      {folder && (
        <Message size={TMessageSize.XS} color={ThemeColors.TEXT} type={TMessageVariant.SECONDARY}>
          {t('workingFolder.currentFolder', { folder })}
        </Message>
      )}
    </>
  );
}
