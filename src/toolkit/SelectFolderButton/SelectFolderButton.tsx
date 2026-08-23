import { CSSVar } from '@src/theme/utils';
import { useAppDispatch } from '@store/hooks';
import { pickFolder } from '@store/thunks';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { TButtonVariant } from '../Button/types';
import RescanButton from './RescanButton';
const Root = styled.div`
  display: flex;
  gap: ${CSSVar('formSpacingInnerX')};
`;

export default function SelectFolderButton() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSelectFolder = async () => {
    const didPickFolder = await dispatch(pickFolder());
    if (didPickFolder) navigate('/');
  };

  return (
    <>
      <Root>
        <Button
          style={{ justifySelf: 'flex-start' }}
          type="button"
          variant={TButtonVariant.SPECIAL}
          icon={TIcon.FOLDER_FAVORITE}
          onClick={() => void handleSelectFolder()}
        >
          {t('workingFolder.selectButton')}
        </Button>
        <RescanButton />
      </Root>
    </>
  );
}
